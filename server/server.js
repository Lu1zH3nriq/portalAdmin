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
app.use(express.static(path.join(__dirname, "..", "client", "build")));

// Rota principal que retorna o index.html do React
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "client", "build", "index.html"));
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
      parameters: [
        {
          name: "@numero",
          value: newMesa.numero
        }
      ]
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
        {
          name: "@numero",
          value: updatedMesa.numero
        },
        {
          name: "@id",
          value: id
        }
      ]
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
  console.log(`Tentando excluir a mesa com número: ${numero}`);
  try {
    // Buscar a mesa pelo número
    const querySpec = {
      query: "SELECT * FROM c WHERE c.numero = @numero",
      parameters: [
        {
          name: "@numero",
          value: numero
        }
      ]
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
  const mesaReserva = req.body;

  try {
    // Buscar a mesa pelo ID
    const { resource: mesa } = await container.item(id, id).read();

    if (!mesa) {
      return res.status(404).json({ error: "Mesa não encontrada" });
    }

    // Atualizar os dados da reserva
    mesa.dataReserva = mesaReserva.dataReserva;
    mesa.horarioReserva = mesaReserva.horarioReserva;
    mesa.nomeCliente = mesaReserva.nomeCliente;
    mesa.telefoneCliente = mesaReserva.telefoneCliente;
    mesa.reserva = true;

    // Salvar as alterações no CosmosDB
    const { resource } = await container.item(id, id).replace(mesa);
    res.status(200).json({ message: "Mesa reservada com sucesso!", data: resource });
  } catch (error) {
    console.error("Erro ao reservar mesa:", error);
    res.status(500).json({ error: "Erro ao reservar a mesa" });
  }
});

// Rota para cancelar reservar da mesa
app.put("/api/cancelarReserva/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Buscar a mesa pelo ID
    const { resource: mesa } = await container.item(id, id).read();

    if (!mesa) {
      return res.status(404).json({ error: "Mesa não encontrada" });
    }

    // Atualizar os dados da reserva
    mesa.dataReserva = "";
    mesa.horarioReserva = "";
    mesa.nomeCliente = "";
    mesa.telefoneCliente = "";
    mesa.reserva = false;

    // Salvar as alterações no CosmosDB
    const { resource } = await container.item(id, id).replace(mesa);
    res.status(200).json({ message: "Reserva cancelada com sucesso!", data: resource });
  } catch (error) {
    console.error("Erro ao cancelar reserva:", error);
    res.status(500).json({ error: "Erro ao cancelar reserva!" });
  }
});

// Rota para ocupar a mesa
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
    res.status(500).json({ error: "Erro ao ocupar mesa!" });
  }
});


// Rota para liberar a mesa
app.put("/api/ocuparMesa/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Buscar a mesa pelo ID
    const { resource: mesa } = await container.item(id, id).read();

    if (!mesa) {
      return res.status(404).json({ error: "Mesa não encontrada" });
    }

    
    mesa.status = "Disponivel";

    // Salvar as alterações no CosmosDB
    const { resource } = await container.item(id, id).replace(mesa);
    res.status(200).json({ message: "Mesa liberada com sucesso!", data: resource });
  } catch (error) {
    console.error("Erro ao liberar mesa:", error);
    res.status(500).json({ error: "Erro ao liberar mesa!" });
  }
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});