import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { extractTextFromPDF } from '../../utils/PDFProcessor';
import './ChatFlutuante.css';

function ChatFlutuante() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Input Controlado (Vital para não dar erro de referência)
  const [inputMessage, setInputMessage] = useState('');

  // Anexos
  const [fileContext, setFileContext] = useState(null); 
  const [fileName, setFileName] = useState(null);       
  const fileInputRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      role: 'model', 
      text: 'Olá! Estou conectado aos dados da empresa (Folha, Funcionários, KPIs). Pode me pedir análises, previsões ou detalhes específicos.'
    }
  ]);

  const messagesEndRef = useRef(null);

  const toggleChat = () => setIsOpen(!isOpen);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Arquivo muito grande. Máximo 5MB.");
      return;
    }

    try {
      setIsLoading(true);
      let text = "";

      if (file.type === 'application/pdf') {
        const pages = await extractTextFromPDF(file);
        text = pages.map(p => p.text).join('\n');
      } else if (file.type.includes('text') || file.type.includes('json') || file.type.includes('csv')) {
        text = await file.text();
      } else {
        alert("Apenas PDF ou Texto/CSV.");
        setIsLoading(false);
        return;
      }

      setFileContext(text);
      setFileName(file.name);
    } catch (err) {
      console.error("Erro leitura:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearFile = () => {
    setFileContext(null);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validação correta usando estado
    if (!inputMessage.trim() && !fileContext) return;

    const displayText = fileName 
      ? `📄 [Arquivo: ${fileName}]: ${inputMessage}` 
      : inputMessage;

    const newMessages = [...messages, { role: 'user', text: displayText }];
    setMessages(newMessages);
    setIsLoading(true);
    setInputMessage(''); // Limpa input

    try {
      // Filtra mensagens para não enviar lixo para a IA
      const historyPayload = newMessages
        .filter(m => !m.text.includes('Erro'))
        .map(msg => ({
          role: msg.role,
          parts: [{ text: msg.text }]
        }));

      const promptFinal = fileContext 
        ? `CONTEXTO DO ARQUIVO (${fileName}):\n${fileContext}\n\nPERGUNTA: ${inputMessage}`
        : inputMessage;

      const { data, error } = await supabase.functions.invoke('chat-assistente', {
        body: { prompt: promptFinal, history: historyPayload } 
      });

      if (error) throw error;
      
      setMessages(prev => [...prev, { role: 'model', text: data.reply }]);
      clearFile();

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', text: 'Erro de conexão. Verifique o console.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-flutuante-wrapper">
      <div className={`chat-janela ${isOpen ? 'open' : ''}`}>
        <div className="chat-header">
          <div className="header-info">
            <h3>QualyBot Analyst</h3>
            <span className="status-dot"></span>
          </div>
          <button onClick={toggleChat} className="chat-close-btn">&times;</button>
        </div>
        
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role === 'user' ? 'user' : 'ai'}`}>
              <div className="msg-bubble">{msg.text}</div>
            </div>
          ))}
          {isLoading && <div className="message ai typing"><div className="dot-typing"></div></div>}
          <div ref={messagesEndRef} />
        </div>
        
        {fileName && (
          <div className="file-attachment-preview">
            <span className="material-symbols-outlined">description</span>
            <small>{fileName}</small>
            <button type="button" onClick={clearFile}>&times;</button>
          </div>
        )}

        <form className="chat-input-form" onSubmit={handleSubmit}>
          <button type="button" className="btn-attach" onClick={() => fileInputRef.current.click()}>
            <span className="material-symbols-outlined">attach_file</span>
          </button>
          <input 
            type="file" ref={fileInputRef} onChange={handleFileSelect} hidden accept=".pdf,.txt,.csv" 
          />
          <input
            type="text"
            placeholder="Pergunte sobre a folha, funcionários..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || (!inputMessage.trim() && !fileContext)}>
            <span className="material-symbols-outlined">send</span>
          </button>
        </form>
      </div>
      <button onClick={toggleChat} className="chat-fab">
        <span className="material-symbols-outlined">smart_toy</span>
      </button>
    </div>
  );
}

export default ChatFlutuante;