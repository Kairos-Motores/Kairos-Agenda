import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { AgendamentoPublico } from './components/AgendamentoPublico.jsx'
import './index.css'

// Rota publica de agendamento (/agendar/<token>) nao passa pelo login nem pelo
// resto da app — e a unica tela que uma pessoa de fora da Kairos ve.
const agendamentoMatch = window.location.pathname.match(/^\/agendar\/([^/]+)\/?$/);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {agendamentoMatch ? <AgendamentoPublico token={agendamentoMatch[1]} /> : <App />}
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