# GreenSight 🌎

Sistema inteligente de mapeamento de bueiros utilizando visão computacional e geolocalização para prevenção de alagamentos urbanos.

## 📌 Sobre o Projeto

O GreenSight é uma solução desenvolvida para auxiliar prefeituras e equipes urbanas no mapeamento e no monitoramento de bueiros em tempo real. O sistema utiliza inteligência artificial e geolocalização para identificar possíveis problemas e gerar alertas preventivos, contribuindo para a redução de enchentes em áreas urbanas.

O projeto surgiu como Trabalho de Conclusão de Curso em Ciência da Computação, com foco em cidades inteligentes, visão computacional e monitoramento urbano.

---

# 🚀 Funcionalidades

- Identificação e cadastro automático de bueiros via visão computacional
- Monitoramento em tempo real
- Exibição geográfica em mapa interativo
- Dashboard administrativo
- Integração com banco de dados geoespacial
- Controle de acesso por perfil de usuário

---

# 🧠 Inteligência Artificial

O sistema utiliza o modelo YOLOv5 para detecção de bueiros através de imagens capturadas por câmera instalada em veículo de monitoramento urbano.

A IA é responsável por:
- detectar bueiros;
- enviar os dados para cadastro no sistema web;
- atualizar o mapa em tempo real.

---

# 🗺️ Arquitetura do Sistema

O fluxo da aplicação funciona da seguinte forma:

1. Captura de imagem por câmera embarcada no carro
2. Processamento com YOLOv5
3. Identificação do bueiro
4. Envio das coordenadas geográficas
5. Armazenamento no PostgreSQL/PostGIS
6. Atualização em tempo real no dashboard web

---

# 💻 Tecnologias Utilizadas

## Backend
- Node.js
- Express
- PostgreSQL
- PostGIS

## Frontend
- ReactJS
- TailwindCSS
- React Router

## Inteligência Artificial
- Python
- YOLOv5
- OpenCV

## Infraestrutura
- GitHub
- Docker
- APIs REST

---

# 📸 Interface do Sistema

## Mapa Interativo

Visualização geográfica dos bueiros identificados pelo sistema.

![Mapa](./assets/mapa.png)

---

## Detecção com YOLOv5

Identificação automática de bueiros através de visão computacional.

![YOLO](./assets/yolo-detection.png)

---

## Relatos da Comunidade

Tela para relatos da população referentes ao status e localização dos bueiros.

![Relatos](./assets/relatos.png)

---

## Dashboard Analítico

Gráficos e métricas em tempo real para acompanhamento urbano.

![Graficos](./assets/graficos.png)

---

# 🔒 Controle de Acesso

O sistema possui diferenciação de permissões entre:
- Administradores
- Funcionários

Cada perfil possui permissões específicas dentro da plataforma.

---

# 🌱 Objetivo do Projeto

O GreenSight busca contribuir para:
- prevenção de enchentes;
- melhoria da infraestrutura urbana;
- cidades inteligentes;
- monitoramento automatizado;
- apoio às equipes de limpeza urbana.

---

# 📈 Melhorias Futuras

- Sistema de classificação de status:
  - 🟢 Livre
  - 🔴 Obstruído
  - 🔵 Não analisado
- Sistema de cadastro e atualização de bueiros manualmente 
- Sistema de notificações automáticas para equipes urbanas
- Integração com aplicativos municipais
- Aprimoramento do treinamento da IA para maior precisão
- Deploy em infraestrutura cloud
- Integração com sensores IoT para monitoramento automatizado
- Histórico de ocorrências e geração de relatórios urbanos

---

# 👨‍💻 Desenvolvedor

Thiago Silvares  
Backend Developer

📫 Contato:  
- LinkedIn: https://linkedin.com/in/thiago-silvares-075883305  
- GitHub: https://github.com/ThiagoSilvares  
- Email: t.silvares74@gmail.com
