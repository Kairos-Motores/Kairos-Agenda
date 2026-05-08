# 🚀 Kairós Workspace

O **Kairós Workspace** é um ecossistema de produtividade de alta performance desenvolvido para a área de Inovação da **Kairós Motores**. Mais do que um calendário, é uma plataforma multi-tenant integrada ao Microsoft Dataverse, oferecendo sincronização em tempo real, gestão de múltiplos calendários e alertas multicanal.

## 🛠️ Stack Tecnológica

* **Frontend:** React.js, Context API, Dnd-kit (Drag & Drop), Date-fns.
* **Design:** Material You (Dynamic Theming), Google Symbols.
* **Backend/Bot:** Node.js, Express, Baileys (WhatsApp Multi-device API).
* **Database:** Microsoft Dataverse (via Proxy seguro).
* **PWA:** Service Workers para funcionamento Offline e Notificações Push.

## ✨ Funcionalidades Principais

* **Workspaces (Multi-Calendários):** Separação lógica entre calendários pessoais, entregas de clientes e demandas de setores.
* **Sistema de Roles:** Gestão de permissões granular (Owner, Secretaria, Diretoria, Manager e Viewer).
* **Alertas Inteligentes:** Notificações via WhatsApp e Push nativo (30, 15, 5 e 0 minutos de antecedência).
* **Offline-First:** Sincronização automática de fila (Sync Queue) após reconexão.
* **Fuso Horário Automático:** Conversão inteligente UTC para visualização local em qualquer lugar do mundo.

---

## 📊 Fluxograma de Arquitetura (Workspace Edition)

O diagrama abaixo detalha como o sistema processa a informação, desde a entrada do usuário até o disparo dos alertas nos dispositivos finais.

### 1. Camada de Interface (React + Material You)

O usuário interage com o grid dinâmico. O sistema detecta o tema do dispositivo e aplica o `themeGenerator` para extrair as cores do Material You.

### 2. Camada de Sincronização (Proxy + Dataverse)

As requisições passam por um proxy para autenticação OAuth2 silenciosa. Os eventos são armazenados em UTC para garantir integridade global.

### 3. Camada de Inteligência de Alerta (O "Heartbeat")

* **Frontend:** Um loop de 30 segundos monitora o estado local e dispara a `Web Notifications API`.
* **Backend:** Um serviço Node.js monitora o banco de dados e dispara mensagens via `Baileys` se o usuário estiver offline ou no WhatsApp.

### 4. Camada Workspace (Nova Funcionalidade)

Os eventos agora são filtrados pelo `cr4a1_calendario_id`, permitindo que um único usuário visualize múltiplas camadas de calendários simultaneamente.

---

## 🚀 Como Executar o Projeto

1. **Clonar o repositório:** `git clone https://github.com/Kairos-Motores/Kairos-Agenda.git`
2. **Configurar Variáveis:** Renomear `.env.example` para `.env` e inserir as credenciais do Dataverse e do Bot.
3. **Instalar Dependências:** `npm install` no diretório raiz e na pasta do bot.
4. **Rodar o Workspace:** `npm start` (Frontend) e `node index.js` (Bot).

---

> **Nota de Inovação:** Este projeto foi concebido para eliminar a latência na comunicação de agendamentos e garantir que a diretoria da Kairós Motores esteja sempre em sincronia com as demandas globais.
