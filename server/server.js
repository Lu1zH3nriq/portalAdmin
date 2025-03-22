require("dotenv").config();
const express = require("express");
const { CosmosClient } = require("@azure/cosmos");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json()); // Middleware para analisar o corpo das requisições JSON

// Configurar o cliente do CosmosDB
const client = new CosmosClient({
  endpoint: process.env.COSMOS_DB_ENDPOINT,
  key: process.env.COSMOS_DB_KEY,
});

const database = client.database(process.env.COSMOS_DB_DATABASE);
const container = database.container(process.env.COSMOS_DB_CONTAINER);

// Servir os arquivos estáticos do React
app.use(express.static(path.join(__dirname, "..", "webapp", "build")));

// Rota principal que retorna o index.html do React
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "webapp", "build", "index.html"));
});

// Rota para buscar todos os documentos do container
app.get("/api/items", async (req, res) => {
  try {
    const { resources } = await container.items.readAll().fetchAll();
    res.json(resources);
  } catch (error) {
    console.error("Erro ao buscar itens:", error);
    res.status(500).json({ error: "Erro ao buscar os itens" });
  }
});

// Rota para criar uma nova mesa
app.post("/api/criarMesa", async (req, res) => {
  try {
    const newMesa = req.body;

    // Verificar se o número da mesa já está cadastrado
    const querySpec = {
      query: "SELECT * FROM c WHERE c.numero = @numero",
      parameters: [{ name: "@numero", value: newMesa.numero }],
    };

    const { resources: mesas } = await container.items.query(querySpec).fetchAll();

    if (mesas.length > 0) {
      return res.status(400).json({ error: "Mesa com esse número já cadastrada!" });
    }

    const { resource } = await container.items.create(newMesa);
    res.status(201).json({ message: "Mesa cadastrada com sucesso!", data: resource });
  } catch (error) {
    console.error("Erro ao criar mesa:", error);
    res.status(500).json({ error: "Erro ao criar a mesa" });
  }
});

// Rota para editar uma mesa
app.put("/api/editarMesa/:id", async (req, res) => {
  const { id } = req.params;
  const updatedMesa = req.body;
  try {
    // Verificar se o número da mesa já está cadastrado
    const querySpec = {
      query: "SELECT * FROM c WHERE c.numero = @numero AND c.id != @id",
      parameters: [
        { name: "@numero", value: updatedMesa.numero },
        { name: "@id", value: id },
      ],
    };

    const { resources: mesas } = await container.items.query(querySpec).fetchAll();

    if (mesas.length > 0) {
      return res.status(400).json({ error: "Mesa com esse número já cadastrada!" });
    }

    const { resource } = await container.item(id, id).replace(updatedMesa);
    res.status(200).json({ message: "Mesa atualizada com sucesso!", data: resource });
  } catch (error) {
    console.error("Erro ao atualizar mesa:", error);
    res.status(500).json({ error: "Erro ao atualizar a mesa" });
  }
});

// Rota para excluir uma mesa pelo número
app.delete("/api/deleteMesa/:numero", async (req, res) => {
  const { numero } = req.params;
  try {
    // Buscar a mesa pelo número
    const querySpec = {
      query: "SELECT * FROM c WHERE c.numero = @numero",
      parameters: [{ name: "@numero", value: numero }],
    };

    const { resources: mesas } = await container.items.query(querySpec).fetchAll();

    if (mesas.length === 0) {
      return res.status(404).json({ error: "Mesa não encontrada" });
    }

    const mesa = mesas[0];
    const { resource } = await container.item(mesa.id, mesa.id).delete();
    res.status(200).json({ message: "Mesa excluída com sucesso!", data: resource });
  } catch (error) {
    console.error("Erro ao excluir mesa:", error);
    res.status(500).json({ error: "Erro ao excluir a mesa" });
  }
});

// Rota para reservar uma mesa
app.put("/api/reservarMesa/:id", async (req, res) => {
  const { id } = req.params;
  const { nomeCliente, telefoneCliente, dataReserva, horarioReserva } = req.body;

  try {
    // Validar se dataReserva e horarioReserva estão presentes
    if (!dataReserva || !horarioReserva) {
      return res.status(400).json({ error: "Data e horário da reserva são obrigatórios." });
    }

    // Validar o formato de dataReserva e horarioReserva
    const dataRegex = /^\d{4}-\d{2}-\d{2}$/; // Formato YYYY-MM-DD
    const horarioRegex = /^\d{2}:\d{2}$/; // Formato HH:mm

    if (!dataRegex.test(dataReserva) || !horarioRegex.test(horarioReserva)) {
      return res.status(400).json({ error: "Formato inválido para data ou horário." });
    }

    // Buscar a mesa pelo ID
    const { resource: mesa } = await container.item(id, id).read();

    if (!mesa) {
      return res.status(404).json({ error: "Mesa não encontrada" });
    }

    // Verificar se já existe uma reserva no mesmo dia
    const reservaExistenteNoDia = mesa.reservas.some(
      (reserva) => reserva.dataReserva === dataReserva
    );

    if (reservaExistenteNoDia) {
      return res.status(400).json({ error: "A mesa já está reservada para essa data." });
    }

    // Combinar dataReserva e horarioReserva para criar um objeto Date no formato ISO
    const dataHoraReserva = new Date(`${dataReserva}T${horarioReserva}:00.000Z`).toISOString();

    // Adicionar a nova reserva ao array de reservas
    mesa.reservas.push({
      nomeCliente,
      telefoneCliente,
      dataReserva, // Apenas a data
      horarioReserva: dataHoraReserva, // Data e hora completas no formato ISO
    });

    // Salvar as alterações no CosmosDB
    const { resource } = await container.item(id, id).replace(mesa);
    res.status(200).json({ message: "Mesa reservada com sucesso!", data: resource });
  } catch (error) {
    console.error("Erro ao reservar mesa:", error);
    res.status(500).json({ error: "Erro ao reservar a mesa" });
  }
});

// Rota para cancelar uma reserva específica
app.put("/api/cancelarReserva/:id", async (req, res) => {
  const { id } = req.params;
  const { dataReserva, horarioReserva } = req.body;

  try {
    // Buscar a mesa pelo ID
    const { resource: mesa } = await container.item(id, id).read();

    if (!mesa) {
      return res.status(404).json({ error: "Mesa não encontrada" });
    }

    // Remover a reserva específica do array de reservas
    mesa.reservas = mesa.reservas.filter(
      (reserva) =>
        reserva.dataReserva !== dataReserva || reserva.horarioReserva !== horarioReserva
    );

    // Salvar as alterações no CosmosDB
    const { resource } = await container.item(id, id).replace(mesa);
    res.status(200).json({ message: "Reserva cancelada com sucesso!", data: resource });
  } catch (error) {
    console.error("Erro ao cancelar reserva:", error);
    res.status(500).json({ error: "Erro ao cancelar reserva!" });
  }
});

// Rota para liberar a mesa (remover todas as reservas)
app.put("/api/liberarMesa/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Buscar a mesa pelo ID
    const { resource: mesa } = await container.item(id, id).read();

    if (!mesa) {
      return res.status(404).json({ error: "Mesa não encontrada" });
    }

    // Limpar o array de reservas e atualizar o status
    mesa.reservas = [];
    mesa.status = "Disponivel";

    // Salvar as alterações no CosmosDB
    const { resource } = await container.item(id, id).replace(mesa);
    res.status(200).json({ message: "Mesa liberada com sucesso!", data: resource });
  } catch (error) {
    console.error("Erro ao liberar mesa:", error);
    res.status(500).json({ error: "Erro ao liberar mesa!" });
  }
});

// Rota para mover uma reserva específica (com data atual) de uma mesa para outra
app.put("/api/moverMesa", async (req, res) => {
  const { id, numeroMesaDestino } = req.body;

  try {
    // Buscar a mesa de origem pelo ID
    const { resource: mesaOrigem } = await container.item(id, id).read();

    if (!mesaOrigem) {
      return res.status(404).json({ error: "Mesa de origem não encontrada" });
    }

    // Buscar a mesa de destino pelo número
    const querySpec = {
      query: "SELECT * FROM c WHERE c.numero = @numero",
      parameters: [{ name: "@numero", value: numeroMesaDestino }],
    };

    const { resources: mesasDestino } = await container.items.query(querySpec).fetchAll();

    if (mesasDestino.length === 0) {
      return res.status(404).json({ error: "Mesa de destino não encontrada" });
    }

    const mesaDestino = mesasDestino[0];

    // Obter a data atual no formato ISO (apenas a parte da data)
    const dataAtual = new Date().toISOString().split('T')[0];

    // Filtrar as reservas da mesa de origem para encontrar as reservas com a data atual
    const reservasParaMover = mesaOrigem.reservas.filter(
      (reserva) => reserva.dataReserva === dataAtual
    );

    // Remover as reservas com a data atual da mesa de origem
    mesaOrigem.reservas = mesaOrigem.reservas.filter(
      (reserva) => reserva.dataReserva !== dataAtual
    );

    // Adicionar as reservas com a data atual à mesa de destino
    mesaDestino.reservas = [...mesaDestino.reservas, ...reservasParaMover];

    // Atualizar o status das mesas

    mesaDestino.status = mesaOrigem.status;

    mesaOrigem.status = "Disponivel";

    // Salvar as alterações no CosmosDB
    await container.item(mesaOrigem.id, mesaOrigem.id).replace(mesaOrigem);
    const { resource: mesaAtualizada } = await container.item(mesaDestino.id, mesaDestino.id).replace(mesaDestino);

    res.status(200).json({
      message: "Reserva movida com sucesso!",
      data: {
        mesaOrigem,
        mesaDestino: mesaAtualizada,
      },
    });
  } catch (error) {
    console.error("Erro ao mover reserva:", error);
    res.status(500).json({ error: "Erro ao mover a reserva!" });
  }
});


// Rota para confirmar uma reserva
app.put("/api/confirmarReserva/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Buscar a mesa pelo ID
    const { resource: mesa } = await container.item(id, id).read();

    if (!mesa) {
      return res.status(404).json({ error: "Mesa não encontrada" });
    }

    // Obter a data atual no formato ISO (apenas a parte da data)
    const dataAtual = new Date().toISOString().split('T')[0];

    // Filtrar as reservas para remover a reserva da data atual
    const reservasAtualizadas = mesa.reservas.filter(
      (reserva) => reserva.dataReserva !== dataAtual
    );

    // Atualizar o array de reservas e o status da mesa
    mesa.reservas = reservasAtualizadas;
    mesa.status = "Ocupada";

    // Salvar as alterações no CosmosDB
    const { resource } = await container.item(id, id).replace(mesa);

    res.status(200).json({ message: "Reserva confirmada com sucesso!", data: resource });
  } catch (error) {
    console.error("Erro ao confirmar reserva:", error);
    res.status(500).json({ error: "Erro ao confirmar a reserva!" });
  }
});


app.put("/api/cancelarReserva", async (req, res) => {
  const { id } = req.body;

  try {
    // Buscar a mesa pelo ID
    const { resource: mesa } = await container.item(id, id).read();

    if (!mesa) {
      return res.status(404).json({ error: "Mesa não encontrada" });
    }

    // Obter a data atual no formato ISO (apenas a parte da data)
    const dataAtual = new Date().toISOString().split('T')[0];

    // Filtrar as reservas para remover a reserva da data atual
    mesa.reservas = mesa.reservas.filter((reserva) => reserva.dataReserva !== dataAtual);

    // Atualizar o status da mesa para "Disponível" apenas se não houver mais reservas
    if (mesa.reservas.length === 0) {
      mesa.status = "Disponivel";
    }

    // Salvar as alterações no CosmosDB
    const { resource } = await container.item(id, id).replace(mesa);

    res.status(200).json({ message: "Reserva cancelada com sucesso!", data: resource });
  } catch (error) {
    console.error("Erro ao cancelar reserva:", error);
    res.status(500).json({ error: "Erro ao cancelar a reserva!" });
  }
});

// Rota para ocupar uma mesa
app.put("/api/ocuparMesa/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Buscar a mesa pelo ID
    const { resource: mesa } = await container.item(id, id).read();

    if (!mesa) {
      return res.status(404).json({ error: "Mesa não encontrada" });
    }

    // Atualizar o status da mesa para "Ocupada"
    mesa.status = "Ocupada";

    // Salvar as alterações no CosmosDB
    const { resource } = await container.item(id, id).replace(mesa);

    res.status(200).json({ message: "Mesa ocupada com sucesso!", data: resource });
  } catch (error) {
    console.error("Erro ao ocupar mesa:", error);
    res.status(500).json({ error: "Erro ao ocupar a mesa!" });
  }
});
// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});