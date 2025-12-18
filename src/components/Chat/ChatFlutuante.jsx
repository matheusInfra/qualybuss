import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { extractTextFromPDF } from '../../utils/PDFProcessor';
import './ChatFlutuante.css';

function ChatFlutuante() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Estado para o texto digitado (Correção do erro ReferenceError)
  const [inputMessage, setInputMessage] = useState('');

  // Estado para Arquivos (Upload no Chat)
  const [fileContext, setFileContext] = useState(null); // Texto extraído do arquivo
  const [fileName, setFileName] = useState(null);       // Nome visual do arquivo
  const fileInputRef = useRef(null);

  // Histórico de Mensagens (Memória)
  const [messages, setMessages] = useState([
    {
      role: 'model', // 'model' ou 'user' (Padrão Gemini)
      text: 'Olá! Sou o QualyBot. Posso analisar documentos, holerites, e dados financeiros da empresa. Como posso ajudar?'
    }
  ]);

  const messagesEndRef = useRef(null);

  const toggleChat = () => setIsOpen(!isOpen);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // --- LÓGICA DE PROCESSAMENTO DE ARQUIVO (CLIENT-SIDE) ---
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Limite de segurança (5MB) para não travar o navegador
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
        alert("Formato não suportado pelo chat. Use PDF ou Texto.");
        setIsLoading(false);
        return;
      }

      setFileContext(text);
      setFileName(file.name);
    } catch (err) {
      console.error("Erro ao ler arquivo:", err);
      setMessages(prev => [...prev, { role: 'model', text: `Erro ao ler o arquivo: ${err.message}` }]);
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
    
    // Usa o estado inputMessage em vez de ler do evento
    if (!inputMessage.trim() && !fileContext) return;

    // 1. Atualiza UI imediatamente
    const displayText = fileName 
      ? `📎 [Analisando ${fileName}]: ${inputMessage}` 
      : inputMessage;

    const newMessages = [...messages, { role: 'user', text: displayText }];
    setMessages(newMessages);
    setIsLoading(true);
    
    // Limpa o campo de texto
    setInputMessage('');

    try {
      // 2. Prepara histórico para a API (Limpa mensagens de erro antigas)
      const historyPayload = newMessages
        .filter(m => !m.text.includes('Erro'))
        .map(msg => ({
          role: msg.role,
          parts: [{ text: msg.text }]
        }));

      // 3. INJEÇÃO DE CONTEXTO DO ARQUIVO
      // Se houver arquivo, ele é injetado "invisivelmente" no prompt atual
      const promptFinal = fileContext 
        ? `CONTEXTO DO ARQUIVO ANEXADO (${fileName}):\n${fileContext}\n\nPERGUNTA DO USUÁRIO:\n${inputMessage}`
        : inputMessage;

      // 4. Chama a Edge Function Inteligente
      const { data, error } = await supabase.functions.invoke('chat-assistente', {
        body: { 
          prompt: promptFinal,
          history: historyPayload // Envia a memória
        } 
      });

      if (error) throw error;
      
      // 5. Resposta da IA
      setMessages(prev => [...prev, { role: 'model', text: data.reply }]);
      clearFile(); // Limpa o arquivo da memória após envio

    } catch (err) {
      console.error('Erro no chat:', err);
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: 'Desculpe, tive um problema de conexão com o cérebro da IA. Tente novamente.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-flutuante-wrapper">
      <div className={`chat-janela ${isOpen ? 'open' : ''}`}>
        
        <div className="chat-header">
          <div className="header-info">
            <h3>QualyBot AI</h3>
            <span className="status-dot"></span>
          </div>
          <button onClick={toggleChat} className="chat-close-btn">&times;</button>
        </div>
        
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.role === 'user' ? 'user' : 'ai'}`}>
              <div className="msg-bubble">
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message ai typing">
              <div className="dot-typing"></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Preview do Arquivo Anexado */}
        {fileName && (
          <div className="file-attachment-preview">
            <span className="material-symbols-outlined">description</span>
            <small>{fileName}</small>
            <button type="button" onClick={clearFile} title="Remover anexo">&times;</button>
          </div>
        )}

        <form className="chat-input-form" onSubmit={handleSubmit}>
          {/* Botão de Clipe (Upload) */}
          <button 
            type="button" 
            className="btn-attach" 
            onClick={() => fileInputRef.current.click()}
            title="Anexar PDF ou Texto"
            disabled={isLoading}
          >
            <span className="material-symbols-outlined">attach_file</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            hidden 
            accept=".pdf,.txt,.csv,.json"
          />

          <input
            type="text"
            name="prompt"
            placeholder={fileName ? "Pergunte sobre o arquivo..." : "Digite sua pergunta..."}
            autoComplete="off"
            disabled={isLoading}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
          />
          <button 
            type="submit" 
            disabled={isLoading || (!inputMessage.trim() && !fileContext)}
          >
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