import { useEffect, useState } from "react";
import axios from "axios";
import { Container, Row, Col, Form, FormGroup, Label, Input, Button, Modal, ModalHeader, ModalBody, ModalFooter, Spinner } from 'reactstrap';
import { FaEdit, FaTrash, FaUserClock } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import logo from './oishi_Icon.png';
import InputMask from 'react-input-mask';

function App() {
  const [items, setItems] = useState([]);
  const [selectedButton, setSelectedButton] = useState('Mesas');
  const [formData, setFormData] = useState({
    numero: '',
    lugares: '',
    reserva: false,
    dataReserva: '',
    horarioReserva: '',
    nomeCliente: '',
    telefoneCliente: '',
    praca: 'Recepção',
    status: 'Disponivel'
  });
  const [selectedMesa, setSelectedMesa] = useState(null);
  const [detailsModal, setDetailsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    state: false,
    message: '',
    type: ''
  });
  const [loadingOptions, setLoadingOptions] = useState({
    delete: false,
    edit: false,
    reserva: false,
    ocupar: false,
    confirmar: false,
    cancelar: false,
    mover: false,
    atualizar: false
  });
  const [editarModal, setEditarModal] = useState({
    state: false,
    mesa: null
  });
  const [reservarModal, setReservarModal] = useState({
    state: false,
    mesa: null
  });

  const [modalMoverMesa, setModalMoverMesa] = useState({
    state: false,
    mesa: null
  });

  const [reservasDaMesaModal, setReservasDaMesaModal] = useState({
    state: false,
    mesa: null
  });

  const API_URL = "https://ois-portaladmin.azurewebsites.net";
  //const API_URL = "http://localhost:3001";

  async function fetchItems() {
    setLoadingOptions({
      ...loadingOptions,
      atualizar: true
    });
    try {
      const response = await axios.get(`${API_URL}/api/items`);
      setItems(response.data);
    } catch (error) {
      console.error("Erro ao buscar itens:", error);
    } finally {
      setLoadingOptions({
        ...loadingOptions,
        atualizar: false
      });
    }
  }

  // Executa fetchItems a cada 5 minutos (300000 ms)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchItems();
    }, 300000); // 5 minutos

    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    fetchItems();
  }, [selectedButton === 'Mesas']);

  const handleButtonClick = (button) => {
    setSelectedButton(button);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    setLoading(true);
    e.preventDefault();

    let dataToSend = {
      numero: formData.numero,
      lugares: formData.lugares,
      praca: formData.praca,
      status: 'Disponivel'
    };

    if (formData.reserva) {
      dataToSend = {
        ...dataToSend,
        reservas: [
          {
            nomeCliente: formData.nomeCliente,
            telefoneCliente: formData.telefoneCliente,
            dataReserva: formData.dataReserva,
            horarioReserva: formData.horarioReserva
          }
        ]
      }
    }
    else {
      dataToSend = {
        ...dataToSend,
        reservas: []
      }
    }

    console.log(dataToSend);
    axios.post(`${API_URL}/api/criarMesa`, dataToSend)
      .then(response => {
        setConfirmModal({
          state: true,
          message: response.data.message,
          type: 'success'
        });

        setFormData({
          numero: '',
          lugares: '',
          reserva: false,
          dataReserva: '',
          horarioReserva: '',
          nomeCliente: '',
          telefoneCliente: '',
          praca: 'Recepção'
        });

      })
      .catch(error => {
        setConfirmModal({
          state: true,
          message: error.response.data.error,
          type: 'error'
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleMesaClick = (mesa) => {
    setSelectedMesa(mesa);
    setDetailsModal(true);
  };

const renderMesas = (praca) => {
  if (loading) {
    // Exibe skeleton enquanto os dados estão sendo carregados
    return Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="mesa-skeleton">
        <div className="skeleton skeleton-title"></div>
        <div className="skeleton skeleton-text"></div>
        <div className="skeleton skeleton-text"></div>
      </div>
    ));
  }

  // Obtém a data atual no formato ISO (apenas a parte da data)
  const dataAtual = new Date().toISOString().split('T')[0];

  return items
    .filter(item => item.praca === praca)
    .map(item => {
      // Filtra as reservas que correspondem à data atual
      const reservasHoje = item.reservas?.filter(reserva => reserva.dataReserva === dataAtual) || [];

      return (
        <div
          key={item.id}
          className={`mesa${reservasHoje.length > 0 ? '-reservada' : item.status === 'Ocupada' ? '-ocupada' : ''}`}
          onClick={() => handleMesaClick(item)}
          style={{ cursor: 'pointer' }}
          title="Clique para ver detalhes"
        >
          <p>Mesa: {item.numero}</p>
          <p>{item.lugares} lugares</p>
          {reservasHoje.length > 0 ? (
            reservasHoje.map((reserva, index) => (
              <div key={index}>
                <p>Reservada às {new Date(reserva.horarioReserva).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'UTC'
                })}</p>
                <p>{reserva.nomeCliente}</p>
              </div>
            ))
          ) : (
            item.status === 'Ocupada' ? (
              <p>Ocupada</p>
            ) : (
              <p>Disponível</p>
            )
          )}
        </div>
      );
    });
};

  const formatarTelefone = (telefone) => {
    if (!telefone) return '';
    const match = telefone.match(/^(\d{2})(\d{5})(\d{4})$/);
    return match ? `(${match[1]}) ${match[2]}-${match[3]}` : telefone;
  };

  const handleDeleteReserva = (reservaToDelete) => {
    const mesaAtualizada = {
      ...reservasDaMesaModal.mesa,
      reservas: reservasDaMesaModal.mesa.reservas.filter(reserva => reserva !== reservaToDelete)
    };

    // Atualiza o estado local
    setReservasDaMesaModal({
      ...reservasDaMesaModal,
      mesa: mesaAtualizada
    });

    // Atualiza no backend
    axios.put(`${API_URL}/api/editarMesa/${mesaAtualizada.id}`, mesaAtualizada)
      .then(response => {
        setConfirmModal({
          state: true,
          message: 'Reserva cancelada com sucesso!',
          type: 'success'
        });
        fetchItems(); // Atualiza a lista de mesas
      })
      .catch(error => {
        setConfirmModal({
          state: true,
          message: error.response?.data?.error || 'Erro ao cancelar a reserva',
          type: 'error'
        });
      });
  };

  return (
    <>
      <Container className="app-container">
        <Row className="justify-content-center mt-4">
          <Col xs="auto">
            <img src={logo} alt="Logo" className="logo" />
          </Col>
          <Col xs="auto" className="d-flex align-items-center">
            <h1 className="restaurant-name">Oishi Restaurante</h1>
          </Col>
        </Row>
        <Row className="justify-content-center mt-2">
          <Col xs="auto">
            <h2 className="section-title">Controle de Mesas</h2>
          </Col>
        </Row>
        <Row className="justify-content-center mt-4 custom-row">
          <Col
            className={`text-center custom-col ${selectedButton === 'Mesas' ? 'selected' : ''}`}
            onClick={() => handleButtonClick('Mesas')}
            md={4}
          >
            Mesas
          </Col>
          <Col
            className={`text-center custom-col ${selectedButton === 'Cadastrar Mesa' ? 'selected' : ''}`}
            onClick={() => {
              handleButtonClick('Cadastrar Mesa');
              setFormData({
                numero: '',
                lugares: '',
                reserva: false,
                dataReserva: '',
                horarioReserva: '',
                nomeCliente: '',
                telefoneCliente: '',
                praca: 'Recepção'
              });
            }}
            md={4}
          >
            Cadastrar Mesa
          </Col>
          {/* <Col
      className={`text-center custom-col ${selectedButton === 'Editar/Excluir Mesa' ? 'selected' : ''}`}
      onClick={() => handleButtonClick('Editar/Excluir Mesa')}
    >
      Editar/Excluir Mesa
    </Col> */}
        </Row>
        <Row className="justify-content-center mt-4">
          <Col xs="auto">
            <Button
              color="primary"
              onClick={fetchItems} // Chama o método fetchItems ao clicar
              style={{ backgroundColor: '#F205B3', border: 'none' }}
            >
              {loadingOptions.atualizar ? <Spinner size="sm" color="light" /> : 'Atualizar'}
            </Button>
          </Col>
        </Row>
      </Container>


      {selectedButton === 'Cadastrar Mesa' && (
        <Container fluid className="form-container" style={{ maxWidth: '40%' }}>
          <Form onSubmit={handleSubmit}>
            <div className="d-flex justify-content-center">
              <Label for="titulo" className="form-label" style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
              }}>Cadastrar Mesa</Label>
            </div>
            <FormGroup className="form-group">
              <Label for="numero" className="form-label">Número da Mesa</Label>
              <Input
                type="number"
                name="numero"
                id="numero"
                value={formData.numero}
                onChange={handleInputChange}
                required
                className="form-input"
              />
            </FormGroup>
            <FormGroup className="form-group">
              <Label for="lugares" className="form-label">Número de Lugares</Label>
              <Input
                type="number"
                name="lugares"
                id="lugares"
                value={formData.lugares}
                onChange={handleInputChange}
                required
                className="form-input"
              />
            </FormGroup>
            <FormGroup className="form-group">
              <Label for="praca" className="form-label">Praça</Label>
              <Input
                type="select"
                name="praca"
                id="praca"
                value={formData.praca}
                onChange={handleInputChange}
                className="form-input"
              >
                <option>Recepção</option>
                <option>Principal</option>
                <option>Mesanino</option>
                <option>Jardin</option>
              </Input>
            </FormGroup>
            <FormGroup className="form-group d-flex align-items-center">
              <Label for="reserva" className="form-label mb-0" style={{ lineHeight: '1.5' }}>Reserva:</Label>
              <Input
                type="checkbox"
                name="reserva"
                id="reserva"
                checked={formData.reserva}
                onChange={handleInputChange}
                className="form-input ml-2"
                style={{ width: 'auto', verticalAlign: 'middle', marginLeft: '10px' }}
              />
            </FormGroup>
            {formData.reserva && (
              <>
                <FormGroup className="form-group">
                  <Label for="dataReserva" className="form-label">Data da Reserva</Label>
                  <Input
                    type="date"
                    name="dataReserva"
                    id="dataReserva"
                    value={formData.dataReserva}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </FormGroup>
                <FormGroup className="form-group">
                  <Label for="horarioReserva" className="form-label">Horário da Reserva</Label>
                  <Input
                    type="time"
                    name="horarioReserva"
                    id="horarioReserva"
                    value={formData.horarioReserva}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </FormGroup>
                <FormGroup className="form-group">
                  <Label for="nomeCliente" className="form-label">Nome do Cliente</Label>
                  <Input
                    type="text"
                    name="nomeCliente"
                    id="nomeCliente"
                    value={formData.nomeCliente}
                    onChange={handleInputChange}
                    required
                    className="form-input"
                  />
                </FormGroup>
                <FormGroup>
                  <Label for="telefoneCliente">Telefone do Cliente</Label>
                  <InputMask
                    mask="(99) 99999-9999"
                    value={formData.telefoneCliente}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\D/g, '');
                      setFormData({
                        ...formData,
                        telefoneCliente: rawValue
                      });
                    }}
                  >
                    {(inputProps) => <Input type="tel" name="telefoneCliente" id="telefoneCliente" {...inputProps} required className="form-input" />}
                  </InputMask>
                </FormGroup>
              </>
            )}

            <div className="d-flex justify-content-center">
              <Button type="submit" className="form-button">
                {loading ? <Spinner size="sm" color="light" /> : 'Cadastrar'}
              </Button>
            </div>
          </Form>
        </Container>
      )}

      {selectedButton === 'Mesas' && (
        <Container fluid className="app-container-view" style={{ maxWidth: '90%' }}>
          <Row className="justify-content-around mt-4" style={{}}>
            <Col md={5} className="praca-col">
              <h3 className="praca-title text-center">Recepção</h3>
              <div className="mesas-container">
                {renderMesas('Recepção')}
              </div>
            </Col>
            <Col md={5} className="praca-col">
              <h3 className="praca-title text-center">Principal</h3>
              <div className="mesas-container">
                {renderMesas('Principal')}
              </div>
            </Col>
          </Row>
          <Row className="justify-content-around mt-4">
            <Col md={5} className="praca-col">
              <h3 className="praca-title text-center">Mesanino</h3>
              <div className="mesas-container">
                {renderMesas('Mesanino')}
              </div>
            </Col>
            <Col md={5} className="praca-col">
              <h3 className="praca-title text-center">Jardim</h3>
              <div className="mesas-container">
                {renderMesas('Jardin')}
              </div>
            </Col>
          </Row>
        </Container>
      )}

      {/* MODAL DE CONFIRMAÇÃO */}
      <Modal isOpen={confirmModal.state} toggle={() => setConfirmModal({ ...confirmModal, state: false })} centered>
        <div className={`modal-header ${confirmModal.type === 'success' ? 'bg-success' : 'bg-danger'}`}>
          <h5 className="modal-title text-white">{confirmModal.type === 'success' ? 'Sucesso' : 'Erro'}</h5>
          <button type="button" className="btn-close" onClick={() => setConfirmModal({ ...confirmModal, state: false })}></button>
        </div>
        <div className="modal-body text-center p-4">
          <p>{confirmModal.message}</p>
        </div>
        <div className="modal-footer">
          <Button style={{
            backgroundColor: '#F205B3',
          }} onClick={() => setConfirmModal({ ...confirmModal, state: false })}>Fechar</Button>
        </div>
      </Modal>

      {/* MODAL PARA VER DETALHES DA MESA */}
      <Modal isOpen={detailsModal} toggle={() => setDetailsModal(false)} centered style={{ width: '90%' }}>
        <ModalHeader toggle={() => setDetailsModal(false)}>Detalhes da Mesa</ModalHeader>
        <ModalBody className="text-start">
          {selectedMesa && (
            <>
              <p><strong>Número:</strong> {selectedMesa.numero}</p>
              <p><strong>Lugares:</strong> {selectedMesa.lugares}</p>
              <p><strong>Praça:</strong> {selectedMesa.praca}</p>

              {/* Verifica se há reservas para a data atual */}
              {selectedMesa.reservas?.some(reserva => reserva.dataReserva === new Date().toISOString().split('T')[0]) ? (
                <>
                  {selectedMesa.reservas
                    .filter(reserva => reserva.dataReserva === new Date().toISOString().split('T')[0])
                    .map((reserva, index) => {
                      // Usa dataReserva diretamente
                      const dataFormatada = reserva.dataReserva.split('-').reverse().join('/'); // Converte para DD/MM/YYYY

                      // Formata o horário
                      const horaFormatada = new Date(reserva.horarioReserva).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'UTC' // Garante que o horário seja tratado como UTC
                      });

                      return (
                        <div key={index}>
                          <p><strong>Reservada para:</strong> {reserva.nomeCliente}</p>
                          <p><strong>Telefone:</strong> {formatarTelefone(reserva.telefoneCliente)}</p>
                          <p><strong>Data:</strong> {dataFormatada}</p>
                          <p><strong>Horário:</strong> {horaFormatada}</p>
                        </div>
                      );
                    })}
                </>
              ) : (
                <p><strong>Status:</strong> {selectedMesa.status}</p>
              )}
            </>
          )}
        </ModalBody>
        <ModalFooter>
          {/* Se a mesa estiver reservada */}
          {selectedMesa?.reservas?.some(reserva => reserva.dataReserva === new Date().toISOString().split('T')[0]) ? (
            <>
              <Button
                color="success"
                onClick={() => {
                  setLoadingOptions({ ...loadingOptions, confirmar: true });

                  axios.put(`${API_URL}/api/confirmarReserva/${selectedMesa.id}`, {
                    reservas: selectedMesa.reservas.filter(
                      reserva => reserva.dataReserva !== new Date().toISOString().split('T')[0]
                    ),
                    status: "Ocupada"
                  })
                    .then(response => {
                      setConfirmModal({
                        state: true,
                        message: response.data.message,
                        type: 'success'
                      });
                      fetchItems();
                      setDetailsModal(false);
                    })
                    .catch(error => {
                      setConfirmModal({
                        state: true,
                        message: error.response?.data?.error || 'Erro ao confirmar a reserva',
                        type: 'error'
                      });
                    })
                    .finally(() => {
                      setLoadingOptions({ ...loadingOptions, confirmar: false });
                    });
                }}
              >
                <FaEdit /> {loadingOptions.confirmar ? <Spinner size="sm" color="light" /> : 'Confirmar Reserva'}
              </Button>

              <Button
                color="danger"
                onClick={() => {
                  setLoadingOptions({ ...loadingOptions, cancelar: true });

                  axios.put(`${API_URL}/api/cancelarReserva`, {
                    id: selectedMesa.id
                  })
                    .then(response => {
                      setConfirmModal({
                        state: true,
                        message: response.data.message,
                        type: 'success'
                      });
                      fetchItems();
                      setDetailsModal(false);
                    })
                    .catch(error => {
                      setConfirmModal({
                        state: true,
                        message: error.response?.data?.error || 'Erro ao cancelar a reserva',
                        type: 'error'
                      });
                    })
                    .finally(() => {
                      setLoadingOptions({ ...loadingOptions, cancelar: false });
                    });
                }}
              >
                <FaUserClock /> {loadingOptions.cancelar ? <Spinner size="sm" color="light" /> : 'Cancelar Reserva'}
              </Button>

              <Button
                style={{ backgroundColor: "#ef1bf2" }}
                onClick={() => {
                  setModalMoverMesa({ state: true, mesa: selectedMesa });
                }}
              >
                <FaUserClock /> {loadingOptions.mover ? <Spinner size="sm" color="light" /> : 'Mover Mesa'}
              </Button>
            </>
          ) : selectedMesa?.status === "Disponivel" ? (
            <>
              <Button
                style={{ backgroundColor: "#ef1bf2" }}
                onClick={() => {
                  setReservarModal({ state: true, mesa: selectedMesa });
                }}
              >
                <FaEdit /> {loadingOptions.confirmar ? <Spinner size="sm" color="light" /> : 'Reservar Mesa'}
              </Button>

              <Button
                color="primary"
                onClick={() => {
                  setEditarModal({ state: true, mesa: selectedMesa });
                }}
              >
                <FaEdit /> Editar
              </Button>

              <Button
                color="danger"
                onClick={() => {
                  setLoadingOptions({ ...loadingOptions, delete: true });

                  axios.delete(`${API_URL}/api/deleteMesa/${selectedMesa.numero}`)
                    .then(response => {
                      setConfirmModal({
                        state: true,
                        message: response.data.message,
                        type: 'success'
                      });
                      fetchItems();
                      setDetailsModal(false);
                    })
                    .catch(error => {
                      setConfirmModal({
                        state: true,
                        message: error.response?.data?.error || 'Erro ao excluir a mesa',
                        type: 'error'
                      });
                    })
                    .finally(() => {
                      setLoadingOptions({ ...loadingOptions, delete: false });
                    });
                }}
              >
                <FaTrash /> {loadingOptions.delete ? <Spinner size="sm" color="light" /> : 'Excluir'}
              </Button>

              <Button
                style={{ backgroundColor: "#28a745" }}
                onClick={() => {
                  setLoadingOptions({ ...loadingOptions, ocupar: true });

                  axios.put(`${API_URL}/api/ocuparMesa/${selectedMesa.id}`)
                    .then(response => {
                      setConfirmModal({
                        state: true,
                        message: response.data.message,
                        type: 'success'
                      });
                      fetchItems();
                      setDetailsModal(false);
                    })
                    .catch(error => {
                      setConfirmModal({
                        state: true,
                        message: error.response?.data?.error || 'Erro ao ocupar a mesa',
                        type: 'error'
                      });
                    })
                    .finally(() => {
                      setLoadingOptions({ ...loadingOptions, ocupar: false });
                    });
                }}
              >
                <FaEdit /> {loadingOptions.ocupar ? <Spinner size="sm" color="light" /> : 'Ocupar Mesa'}
              </Button>
            </>
          ) : selectedMesa?.status === "Ocupada" ? (
            <>
              <Button
                style={{ backgroundColor: "#28a745" }}
                onClick={() => {
                  setLoadingOptions({ ...loadingOptions, confirmar: true });

                  axios.put(`${API_URL}/api/liberarMesa/${selectedMesa.id}`)
                    .then(response => {
                      setConfirmModal({
                        state: true,
                        message: response.data.message,
                        type: 'success'
                      });
                      fetchItems();
                      setDetailsModal(false);
                    })
                    .catch(error => {
                      setConfirmModal({
                        state: true,
                        message: error.response?.data?.error || 'Erro ao liberar a mesa',
                        type: 'error'
                      });
                    })
                    .finally(() => {
                      setLoadingOptions({ ...loadingOptions, confirmar: false });
                    });
                }}
              >
                <FaEdit /> {loadingOptions.confirmar ? <Spinner size="sm" color="light" /> : 'Liberar Mesa'}
              </Button>

              <Button
                color="danger"
                onClick={() => {
                  setModalMoverMesa({ state: true, mesa: selectedMesa });
                }}
              >
                <FaUserClock /> {loadingOptions.mover ? <Spinner size="sm" color="light" /> : 'Mover Mesa'}
              </Button>
            </>
          ) : null}
          <Button color="secondary" onClick={() => setReservasDaMesaModal({
            state: true,
            mesa: selectedMesa
          })}>Reservas</Button>
          <Button color="secondary" onClick={() => setDetailsModal(false)}>Fechar</Button>
        </ModalFooter>
      </Modal>

      {/* MODAL PARA RESERVAR MESA */}
      <Modal
        isOpen={reservarModal.state}
        toggle={() => setReservarModal({
          state: false,
          mesa: null
        })}
        centered

      >
        <ModalHeader
          toggle={() => setReservarModal({
            state: false,
            mesa: null
          })}
        >
          Reservar Mesa
        </ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="nomeCliente">Nome do Cliente</Label>
              <Input type="text" name="nomeCliente" id="nomeCliente"
                value={reservarModal?.mesa?.nomeCliente}
                onChange={(e) => setReservarModal({
                  ...reservarModal,
                  mesa: {
                    ...reservarModal.mesa,
                    nomeCliente: e.target.value
                  }
                })}
              />
            </FormGroup>
            <FormGroup>
              <Label for="telefoneCliente">Telefone do Cliente</Label>
              <InputMask
                mask="(99) 99999-9999"
                value={reservarModal?.mesa?.telefoneCliente}
                onChange={(e) => {
                  const rawValue = e.target.value.replace(/\D/g, ''); // Remove todos os caracteres não numéricos
                  setReservarModal({
                    ...reservarModal,
                    mesa: {
                      ...reservarModal.mesa,
                      telefoneCliente: rawValue
                    }
                  });
                }}
              >
                {(inputProps) => <Input type="tel" name="telefoneCliente" id="telefoneCliente" {...inputProps} required className="form-input" />}
              </InputMask>
            </FormGroup>
            <FormGroup>
              <Label for="dataReserva">Data da Reserva</Label>
              <Input type="date" name="dataReserva" id="dataReserva"
                value={reservarModal?.mesa?.dataReserva}
                onChange={(e) => setReservarModal({
                  ...reservarModal,
                  mesa: {
                    ...reservarModal.mesa,
                    dataReserva: e.target.value
                  }
                })}
              />
            </FormGroup>
            <FormGroup>
              <Label for="horarioReserva">Horário da Reserva</Label>
              <Input type="time" name="horarioReserva" id="horarioReserva"
                value={reservarModal?.mesa?.horarioReserva}
                onChange={(e) => setReservarModal({
                  ...reservarModal,
                  mesa: {
                    ...reservarModal.mesa,
                    horarioReserva: e.target.value
                  }
                })}
              />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button
            style={{ backgroundColor: '#28a745' }}
            onClick={() => {
              setLoadingOptions({
                ...loadingOptions,
                reserva: true
              });

              axios.put(`${API_URL}/api/reservarMesa/${selectedMesa.id}`, {
                nomeCliente: reservarModal.mesa.nomeCliente,
                telefoneCliente: reservarModal.mesa.telefoneCliente,
                dataReserva: reservarModal.mesa.dataReserva, // Apenas a data no formato YYYY-MM-DD
                horarioReserva: reservarModal.mesa.horarioReserva // Apenas o horário no formato HH:mm
              })
                .then(response => {
                  setConfirmModal({
                    state: true,
                    message: response.data.message,
                    type: 'success'
                  });
                  fetchItems();
                  setReservarModal({
                    state: false,
                    mesa: null
                  });
                  setDetailsModal(false);
                })
                .catch(error => {
                  setConfirmModal({
                    state: true,
                    message: error.response?.data?.error || 'Erro ao reservar a mesa',
                    type: 'error'
                  });
                  setReservarModal({
                    state: false,
                    mesa: null
                  });
                  setDetailsModal(false);
                })
                .finally(() => {
                  setLoadingOptions({
                    ...loadingOptions,
                    reserva: false
                  });
                });
            }}
          >
            {loadingOptions.reserva ? <Spinner size="sm" color="light" /> : 'Reservar'}
          </Button>
          <Button
            onClick={() => setReservarModal({
              state: false,
              mesa: null
            })}
          >Cancelar</Button>
        </ModalFooter>
      </Modal >

      {/* MODAL PARA EDITAR MESA */}
      < Modal
        isOpen={editarModal.state}
        toggle={() => setEditarModal({
          state: false,
          mesa: null
        })
        }
        centered
      >
        <ModalHeader toggle={() => setEditarModal({
          state: false,
          mesa: null
        })}>
          Editar Mesa
        </ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="numero">Número da Mesa</Label>
              <Input type="number" name="numero" id="numero" value={editarModal?.mesa?.numero}
                onChange={(e) => setEditarModal({
                  ...editarModal,
                  mesa: {
                    ...editarModal.mesa,
                    numero: e.target.value
                  }
                })}
              />
            </FormGroup>
            <FormGroup>
              <Label for="lugares">Número de Lugares</Label>
              <Input type="number" name="lugares" id="lugares"
                value={editarModal?.mesa?.lugares}
                onChange={(e) => setEditarModal({
                  ...editarModal,
                  mesa: {
                    ...editarModal.mesa,
                    lugares: e.target.value
                  }
                })}
              />
            </FormGroup>
            <FormGroup>
              <Label for="praca">Praça</Label>
              <Input type="select" name="praca" id="praca" value={editarModal?.mesa?.praca}
                onChange={(e) => setEditarModal({
                  ...editarModal,
                  mesa: {
                    ...editarModal.mesa,
                    praca: e.target.value
                  }
                })}
              >
                <option>Recepção</option>
                <option>Principal</option>
                <option>Mesanino</option>
                <option>Jardin</option>
              </Input>
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button
            style={{ backgroundColor: '#28a745' }}
            onClick={() => {
              setLoadingOptions({
                ...loadingOptions,
                edit: true
              });

              axios.put(`${API_URL}/api/editarMesa/${selectedMesa.id}`, editarModal.mesa)
                .then(response => {
                  setConfirmModal({
                    state: true,
                    message: response.data.message,
                    type: 'success'
                  });
                  fetchItems();
                  setEditarModal({
                    state: false,
                    mesa: null
                  });
                  setDetailsModal(false);
                })
                .catch(error => {
                  setConfirmModal({
                    state: true,
                    message: error.response.data.error,
                    type: 'error'
                  });
                  setEditarModal({
                    state: false,
                    mesa: null
                  });
                  setDetailsModal(false);
                })
                .finally(() => {
                  setLoadingOptions({
                    ...loadingOptions,
                    edit: false
                  });
                });
            }}
          >
            {loadingOptions.edit ? <Spinner size="sm" color="light" /> : 'Editar'}
          </Button>
          <Button
            onClick={() => setEditarModal({
              state: false,
              mesa: null
            })}
          >Cancelar</Button>
        </ModalFooter>
      </Modal >

      {/* MODAL PARA MOVER MESA */}
      < Modal
        isOpen={modalMoverMesa.state}
        toggle={() => setModalMoverMesa({
          state: false,
          mesa: null
        })}
        centered
      >
        <ModalHeader toggle={() => setModalMoverMesa({
          state: false,
          mesa: null
        })}>
          Mover Mesa
        </ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="numeroMesaDestino">Número da Mesa de Destino</Label>
              <Input
                type="number"
                name="numeroMesaDestino"
                id="numeroMesaDestino"
                value={modalMoverMesa?.mesa?.numeroMesaDestino || ''}
                onChange={(e) => setModalMoverMesa({
                  ...modalMoverMesa,
                  mesa: {
                    ...modalMoverMesa.mesa,
                    numeroMesaDestino: e.target.value
                  }
                })}
                placeholder="Digite o número da mesa de destino"
              />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button
            style={{ backgroundColor: '#28a745' }}
            onClick={() => {
              setLoadingOptions({
                ...loadingOptions,
                mover: true
              });

              axios.put(`${API_URL}/api/moverMesa`, {
                id: modalMoverMesa.mesa.id,
                numeroMesaDestino: modalMoverMesa.mesa.numeroMesaDestino
              })
                .then(response => {
                  setConfirmModal({
                    state: true,
                    message: response.data.message,
                    type: 'success'
                  });
                  fetchItems();
                  setModalMoverMesa({
                    state: false,
                    mesa: null
                  });
                  setDetailsModal(false);
                })
                .catch(error => {
                  setConfirmModal({
                    state: true,
                    message: error.response?.data?.error || 'Erro ao mover a mesa',
                    type: 'error'
                  });
                  setModalMoverMesa({
                    state: false,
                    mesa: null
                  });
                  setDetailsModal(false);
                })
                .finally(() => {
                  setLoadingOptions({
                    ...loadingOptions,
                    mover: false
                  });
                });
            }}
          >
            {loadingOptions.mover ? <Spinner size="sm" color="light" /> : 'Mover'}
          </Button>
          <Button
            onClick={() => setModalMoverMesa({
              state: false,
              mesa: null
            })}
          >
            Cancelar
          </Button>
        </ModalFooter>
      </Modal >

      {/* MODAL PARA VER RESERVAS DA MESA */}
      <Modal
        isOpen={reservasDaMesaModal.state}
        toggle={() => setReservasDaMesaModal({
          state: false,
          mesa: null
        })}
        centered
        style={{ maxWidth: '80%' }} // Ajuste o tamanho máximo do modal
      >
        <ModalHeader toggle={() => setReservasDaMesaModal({
          state: false,
          mesa: null
        })}>
          Reservas da Mesa {reservasDaMesaModal.mesa?.numero}
        </ModalHeader>
        <ModalBody>
          <div className="calendar-container">
            {/* Gera os próximos 7 dias */}
            {Array.from({ length: 7 }).map((_, index) => {
              const currentDate = new Date();
              currentDate.setDate(currentDate.getDate() + index); // Adiciona os dias ao dia atual
              const dataFormatada = currentDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });

              // Obtém a data no formato YYYY-MM-DD para comparação
              const currentDateISO = currentDate.toISOString().split('T')[0];

              // Filtra as reservas para o dia atual
              const reservasDoDia = reservasDaMesaModal.mesa?.reservas?.filter(reserva => {
                return reserva.dataReserva === currentDateISO;
              });

              return (
                <div key={index} className="calendar-day">
                  <div className="day-header">{dataFormatada}</div>
                  <div className="day-reservas">
                    {reservasDoDia?.length > 0 ? (
                      reservasDoDia.map((reserva, i) => {
                        const horarioReserva = new Date(reserva.horarioReserva);
                        const horaFormatada = `${horarioReserva.getUTCHours().toString().padStart(2, '0')}:${horarioReserva.getUTCMinutes().toString().padStart(2, '0')}`;

                        return (
                          <div key={i} className="reserva-item">
                            <p><strong>Nome:</strong> {reserva.nomeCliente}</p>
                            <p><strong>Telefone:</strong> {formatarTelefone(reserva.telefoneCliente)}</p>
                            <p><strong>Horário:</strong> {horaFormatada}</p>
                            <Button
                              color="danger"
                              size="sm"
                              className="delete-reserva-btn"
                              onClick={() => handleDeleteReserva(reserva)}
                            >
                              <FaTrash />
                            </Button>
                          </div>
                        );
                      })
                    ) : (
                      <p className="no-reservas">Sem reservas</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            onClick={() => setReservasDaMesaModal({
              state: false,
              mesa: null
            })}
          >
            Fechar
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

export default App;