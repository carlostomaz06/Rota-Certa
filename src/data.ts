import { Loja, User } from './types';

export const SEED_LOJAS_RAW = [
  ["1","001-TAN","A","Tanguá","Rua Manuel João Gonçalves","Ampliação","Vinicios"],
  ["2","002-MG1","D","Magé 1","Av. Simão da Mota","Centro","Diego"],
  ["3","003-JCT","A","Jardim Catarina","Av. Doutor Albino Imparato","Jardim Catarina","Vinicios"],
  ["4","004-MAR","B","Maricá","Rod. Ernani do Amaral Peixoto","São José do Imbassaí","Matheus"],
  ["7","007-ARS","B","Arsenal","Rua Dr. Eugênio Borges","Arsenal","Matheus"],
  ["8","008-AGM","D","Água Mineral","Rua Salvatori","Água Mineral","Diego"],
  ["9","009-RB1","A","Rio Bonito 1","Avenida Martinho de Almeida","Mangueirinha","Vinicios"],
  ["10","010-ITB","A","Itaboraí","Avenida Vinte e Dois de Maio","Centro","Vinicios"],
  ["11","011-BTF","D","Botafogo","Praia de Botafogo","Botafogo","Diego"],
  ["12","012-MG2","D","Magé 2","Rua Comendador Reis","Magé","Diego"],
  ["13","013-BX1","B","Bacaxá 1","Rod. Amaral Peixoto","Bacaxá","Matheus"],
  ["14","014-AR1","B","Araruama 1","Rod. Amaral Peixoto","Centro","Matheus"],
  ["15","015-CF1","C","Cabo Frio 1","Rua Henrique Terra","Parque Burle","Nilson"],
  ["16","016-SPD","C","São Pedro","Rua Camerindo Santos","Centro","Nilson"],
  ["17","017-JE1","C","Jardim Esperança","Rua Ésio Cardoso da Fonseca","Jardim Esperança","Nilson"],
  ["18","018-MAC","C","Macaé","Av. Rui Barbosa","Cajueiro","Nilson"],
  ["19","019-RDO","B","Rio do Ouro","Av. Doutor Eugênio Borges","Rio do Ouro","Matheus"],
  ["20","020-INO","B","Inoã","Rua Gilma dos Santos Duarte","Inoã","Matheus"],
  ["21","021-RB2","A","Rio Bonito 2","Rua Eulálio Custódio Pires","Centro","Vinicios"],
  ["22","022-BX2","B","Bacaxá 2","Av. Saquarema","Bacaxá","Matheus"],
  ["23","023-TRI","A","Trindade","Av. Doutor Humberto Soeiro de Carvalho","Trindade","Vinicios"],
  ["24","024-NCD","A","Nova Cidade","Rua Vicente de Lima Cleto","Nova Cidade","Vinicios"],
  ["25","025-AR2","B","Araruama 2","Rod. Amaral Peixoto","Vila Capri","Matheus"],
  ["26","026-MRC","D","Maracanã","Rua São Francisco Xavier","Maracanã","Diego"],
  ["27","027-ROC","D","Rocha","Av. Pres. Humberto de Alencar C. Branco","Rocha","Diego"],
  ["29","029-CPC","D","Copacabana","Rua Barata Ribeiro","Copacabana","Diego"],
  ["30","030-CF2","C","Cabo Frio 2","Rua Governador Valadares","São Cristóvão","Nilson"],
  ["32","032-CAS","A","Casimiro de Abreu","Rua Pastor Luis Laurentino da Silva","Vila Mataruna","Vinicios"],
  ["33","033-UNA","C","Unamar","Rod. Amaral Peixoto","Orla 500 / Tamoios","Nilson"],
  ["34","034-CLB","D","Colubandê","Rua Capitão Juvenal Figueiredo","Colubandê","Diego"],
  ["35","035-IGB","C","Iguaba","Av. Paulino Rodrigues de Souza","Centro","Nilson"],
  ["36","036-COR","B","Coqueirinho","Avenida Maysa","Maricá","Matheus"],
  ["37","037-BZ1","C","Búzios","Rua Justiniano de Souza","Centro (Cabo Frio)","Nilson"],
  ["38","038-ROS","C","Rio das Ostras","Alameda Copomar","Cidade Praiana","Nilson"],
  ["41","041-MC2","C","Macaé 2","Av. Aluízio da Silva Gomes","Glória","Nilson"],
  ["42","042-MTD","A","Mutuá","Rua Doutor Alfredo Backer","Alcântara","Vinicios"]
];

export const INITIAL_LOJAS: Loja[] = SEED_LOJAS_RAW.map((r) => ({
  id: `loja_${r[0]}`,
  filial: r[0],
  codigo: r[1],
  regional: r[2],
  nome: r[3],
  endereco: r[4],
  bairro: r[5],
  cidade: r[3],
  estado: 'RJ',
  supervisor: r[6],
  prazo: null,
  observacoes: ''
}));

export const INITIAL_USERS: User[] = [
  { id: 'user_0', nome: "Aldai",     email: "aldai@alvorada.com",     senha: "1234" },
  { id: 'user_1', nome: "Gois",      email: "gois@alvorada.com",      senha: "1234" },
  { id: 'user_2', nome: "Natanael",  email: "natanael@alvorada.com",  senha: "1234" },
  { id: 'user_3', nome: "Kadu",      email: "kadu@alvorada.com",      senha: "1234" },
  { id: 'user_4', nome: "Natalia",   email: "natalia@alvorada.com",   senha: "1234" },
  { id: 'user_5', nome: "David",     email: "david@alvorada.com",     senha: "1234" },
  { id: 'user_6', nome: "Kamyle",    email: "kamyle@alvorada.com",    senha: "1234" }
];

export const STATUS_OPCOES = [
  "OK - Sem pendências",
  "Ajustes no planograma necessários",
  "Ruptura identificada",
  "Loja fechada / não atendeu",
  "Reforma / obra em andamento",
  "Outro"
];
