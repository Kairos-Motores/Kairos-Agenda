import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { AgendamentoPublico } from './components/AgendamentoPublico.jsx'
import { PrivacyPolicy } from './components/PrivacyPolicy.jsx'
import { startDynamicFavicon } from './utils/dynamicFavicon.js'
import './index.css'

startDynamicFavicon();

// Rota publica de agendamento (/agendar/<token>) nao passa pelo login nem pelo
// resto da app — e a unica tela que uma pessoa de fora da Kairos ve.
const agendamentoMatch = window.location.pathname.match(/^\/agendar\/([^/]+)\/?$/);
const isPrivacyPage = window.location.pathname.replace(/\/$/, '') === '/privacidade';

const renderRoot = () => {
  if (isPrivacyPage) return <PrivacyPolicy />;
  if (agendamentoMatch) return <AgendamentoPublico token={agendamentoMatch[1]} />;
  return <App />;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {renderRoot()}
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('ServiceWorker registrado com sucesso no escopo: ', registration.scope);
    }).catch(err => {
      console.log('Falha ao registrar o ServiceWorker: ', err);
    });
  });
}