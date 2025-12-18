import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
// Reutiliza seu processador de PDF existente
import { extractTextFromPDF } from '../../utils/PDFProcessor'; 
import './ChatFlutuante.css';

function ChatFlutuante() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileContext, setFileContext] = useState(null); // Texto extraído do arquivo
  const [fileName, setFileName] = useState(null);       // Nome visual do arquivo
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      role: 'model',
      text: 'Olá! Sou o QualyBot. Posso analisar documentos, dados da folha e fazer simulações. Como ajudo?'
    }
  ]);

  const toggleChat = () => setIsOpen(!isOpen);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- LÓGICA DE ARQUIVO ---
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Limite de segurança (ex: 2MB de texto puro é muita coisa)
    if (file.size > 5 * 1024 * 1024) {
      alert("Arquivo muito grande. Máximo 5MB.");
      return;
    }

    try {
      setIsLoading(true);
      let text = "";

      if (file.type === 'application/pdf') {
        // Usa sua função utilitária existente
        const pages = await extractTextFromPDF(file);
        text = pages.map(p => p.text).join('\n');
      } else if (file.type.includes('text') || file.type.includes('json')) {
        text = await file.text();
      } else {
        alert("Formato não suportado pelo chat (apenas PDF ou Texto).");
        setIsLoading(false);
        return;
      }

      setFileContext(text);
      setFileName(file.name);
    } catch (err) {
      console.error("Erro ao ler arquivo:", err);
      alert("Erro ao ler o arquivo.");
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
    const userInput = e.target.elements.prompt.value;
    
    // Permite enviar só o arquivo se tiver contexto, ou só texto
    if (!userInput.trim() && !fileContext) return;

    // Monta a mensagem visual do usuário
    const userDisplayMsg = fileName 
      ? `📄 [Analisando ${fileName}]: ${userInput}` 
      : userInput;

    const newMessages = [...messages, { role: 'user', text: userDisplayMsg }];
    setMessages(newMessages);
    setIsLoading(true);
    e.target.reset();

    try {
      // Prepara o payload histórico
      const historyPayload = newMessages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

      // --- O GRANDE TRUQUE ---
      // Injetamos o conteúdo do arquivo no prompt atual invisivelmente para a IA
      const promptFinal = fileContext 
        ? `CONTEXTO DO ARQUIVO ANEXADO (${fileName}):\n${fileContext}\n\nPERGUNTA DO USUÁRIO SOBRE O ARQUIVO:\n${userInput}`
        : userInput;

      // Chama a Edge Function
      const { data, error } = await supabase.functions.invoke('chat-assistente', {
        body: { 
          history: historyPayload,
          prompt: promptFinal 
        } 
      });

      if (error) throw error;
      
      setMessages(prev => [...prev, { role: 'model', text: data.reply }]);
      
      // Limpa o arquivo após envio (memória curta)
      clearFile();

    } catch (err) {
      console.error('Erro:', err);
      setMessages(prev => [...prev, { role: 'model', text: 'Erro de conexão. Tente novamente.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-flutuante-wrapper">
      <div className={`chat-janela ${isOpen ? 'open' : ''}`}>
        <div className="chat-header">
          <h3>QualyBot 🤖</h3>
          <button onClick={toggleChat} className="chat-close-btn">&times;</button>
        </div>
        
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.role === 'user' ? 'user' : 'ai'}`}>
              <div className="msg-bubble">{msg.text}</div>
            </div>
          ))}
          {isLoading && <div className="message ai typing">Analisando...</div>}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Área de Preview do Arquivo */}
        {fileName && (
          <div className="file-attachment-preview">
            <span className="material-symbols-outlined">description</span>
            <small>{fileName}</small>
            <button type="button" onClick={clearFile}>&times;</button>
          </div>
        )}

        <form className="chat-input-form" onSubmit={handleSubmit}>
          {/* Botão de Anexo */}
          <button 
            type="button" 
            className="btn-attach" 
            onClick={() => fileInputRef.current.click()}
            title="Anexar PDF ou Texto"
          >
            <span className="material-symbols-outlined">attach_file</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            hidden 
            accept=".pdf,.txt,.json,.csv"
          />

          <input 
            type="text" 
            name="prompt" 
            placeholder={fileName ? "Pergunte sobre o arquivo..." : "Digite sua pergunta..."}
            autoComplete="off" 
            disabled={isLoading} 
          />
          <button type="submit" disabled={isLoading || (!fileName && !fileContext)}>
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