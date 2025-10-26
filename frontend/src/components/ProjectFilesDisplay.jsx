// ProjectFilesDisplay.jsx - FIXED WITH PROPER STREAMING ANIMATIONS
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CodeRainAnimation = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const codeSnippets = [
      "const merny = new AI();", "merny.build(project);", "return <FullStack />;",
      "useEffect(() => { create(); });", "import { MERN } from 'merny';",
      "opacity: 1; transition: all 0.5s;", "let promise = resolve(true);",
      "// Building next-gen apps...", "<MERNYComponent priority='high' />",
      "function generateCode(data) { ... }", "await deploy.toCloud();",
    ];

    const fontSize = 14;
    const lines = [];
    const numLines = 50;

    class CodeLine {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.text = codeSnippets[Math.floor(Math.random() * codeSnippets.length)];
        this.charIndex = 0; this.alpha = 0; this.life = 0;
        this.maxLife = 200 + Math.random() * 200;
        this.typingSpeed = 2 + Math.random() * 2;
      }
      draw() {
        this.life++;
        if (this.life < this.maxLife * 0.2) this.alpha = Math.min(this.alpha + 0.05, 0.25);
        else if (this.life > this.maxLife * 0.8) this.alpha = Math.max(this.alpha - 0.01, 0);
        if (this.life % this.typingSpeed < 1 && this.charIndex < this.text.length) this.charIndex++;
        ctx.font = `${fontSize}px monospace`;
        ctx.fillStyle = `rgba(174, 154, 100, ${this.alpha})`;
        ctx.fillText(this.text.substring(0, this.charIndex), this.x, this.y);
        if (this.life >= this.maxLife) this.reset();
      }
    }

    for (let i = 0; i < numLines; i++) lines.push(new CodeLine());
    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      lines.forEach(line => line.draw());
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();
    const handleResize = () => { if (canvas) { canvas.width = window.innerWidth; canvas.height = window.innerHeight; } };
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); cancelAnimationFrame(animationFrameId); };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1 }} />;
};

const buildFileTree = (files) => {
  const tree = {};
  
  files.forEach((file) => {
    const parts = file.filename.split('/');
    let current = tree;
    
    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        if (!current._files) current._files = [];
        current._files.push({ name: part, content: file.content, fullPath: file.filename });
      } else {
        if (!current[part]) current[part] = {};
        current = current[part];
      }
    });
  });
  
  return tree;
};

const FileTreeNode = ({ name, node, level = 0, onFileSelect, selectedFile }) => {
  const [isOpen, setIsOpen] = useState(level < 2);
  const isFolder = node && typeof node === 'object' && !node.content;
  const files = node._files || [];
  const folders = Object.keys(node).filter(key => key !== '_files');

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const iconMap = {
      'js': '📜', 'jsx': '⚛️', 'ts': '📘', 'tsx': '⚛️',
      'json': '📋', 'html': '🌐', 'css': '🎨', 'scss': '🎨',
      'md': '📝', 'txt': '📄', 'env': '🔐', 'gitignore': '🚫',
      'lock': '🔒', 'yml': '⚙️', 'yaml': '⚙️'
    };
    return iconMap[ext] || '📄';
  };

  if (!isFolder && node.content) {
    return (
      <div
        onClick={() => onFileSelect(node)}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 8px',
          paddingLeft: `${level * 20 + 8}px`,
          cursor: 'pointer',
          backgroundColor: selectedFile?.fullPath === node.fullPath ? 'rgba(174, 154, 100, 0.2)' : 'transparent',
          borderLeft: selectedFile?.fullPath === node.fullPath ? '3px solid #AE9A64' : '3px solid transparent',
          transition: 'all 0.2s ease',
          fontSize: '0.875rem',
          color: '#E5E5E5',
          fontFamily: 'monospace'
        }}
        onMouseEnter={(e) => {
          if (selectedFile?.fullPath !== node.fullPath) {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
          }
        }}
        onMouseLeave={(e) => {
          if (selectedFile?.fullPath !== node.fullPath) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        <span style={{ marginRight: '8px' }}>{getFileIcon(node.name)}</span>
        <span>{node.name}</span>
      </div>
    );
  }

  return (
    <div>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 8px',
          paddingLeft: `${level * 20 + 8}px`,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          fontSize: '0.875rem',
          color: '#C0B084',
          fontWeight: '600',
          fontFamily: 'monospace'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <span style={{ marginRight: '6px', transition: 'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          ▸
        </span>
        <span style={{ marginRight: '8px' }}>{isOpen ? '📂' : '📁'}</span>
        <span>{name}</span>
      </div>
      
      {isOpen && (
        <div>
          {folders.map(folderName => (
            <FileTreeNode
              key={folderName}
              name={folderName}
              node={node[folderName]}
              level={level + 1}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
            />
          ))}
          {files.map((file, idx) => (
            <FileTreeNode
              key={idx}
              name={file.name}
              node={file}
              level={level + 1}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ProjectFilesDisplay = ({
  projectData,
  answers,
  theme,
  projectFiles,
  setProjectFiles,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [streamingText, setStreamingText] = useState('');
  const [fileCount, setFileCount] = useState(0);
  const [currentFileName, setCurrentFileName] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [isStreaming, setIsStreaming] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState([]);
  
  const fetchedRef = useRef(false);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (fetchedRef.current || !projectData?._id || projectFiles.length > 0) {
      if (projectFiles.length > 0) {
        console.log('✅ Files already exist, skipping API call');
      }
      return;
    }

    fetchedRef.current = true;
    console.log("🏗️ Starting file generation for project:", projectData._id);

    const buildProjectWithStreaming = async () => {
      setLoading(true);
      setError(null);
      setLoadingMessage('🌊 Connecting to AI...');
      setIsStreaming(false);
      setGeneratedFiles([]);
      
      abortControllerRef.current = new AbortController();

      try {
        console.log("📡 Starting STREAMING request");
        setLoadingMessage('🌊 AI is analyzing your project...');
        setIsStreaming(true);
        
        const response = await fetch(`${API_BASE_URL}/api/project/final-build-stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            projectId: projectData._id, 
            answers: answers || {}, 
            theme: theme || {} 
          }),
          signal: abortControllerRef.current.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let receivedAnyData = false;

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('✅ Stream complete');
            break;
          }
          
          receivedAnyData = true;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'chunk' && data.chunk) {
                  setStreamingText(prev => {
                    const newText = prev + data.chunk;
                    return newText.length > 4000 ? newText.slice(-4000) : newText;
                  });
                  setLoadingMessage('✨ Generating code...');
                } else if (data.type === 'file' && data.filename) {
                  setCurrentFileName(data.filename);
                  setFileCount(data.count);
                  setGeneratedFiles(prev => [...prev, data.filename]);
                  setLoadingMessage(`✨ Generated ${data.count} files...`);
                  console.log(`📄 File ${data.count}: ${data.filename}`);
                } else if (data.type === 'complete' && data.files) {
                  console.log('🎉 Files received:', data.files.length);
                  setProjectFiles(data.files);
                  if (data.files.length > 0) {
                    setSelectedFile({ 
                      name: data.files[0].filename.split('/').pop(), 
                      content: data.files[0].content, 
                      fullPath: data.files[0].filename 
                    });
                  }
                  setLoading(false);
                  setStreamingText('');
                  setCurrentFileName('');
                  setFileCount(0);
                  setIsStreaming(false);
                  setGeneratedFiles([]);
                  return;
                } else if (data.type === 'error') {
                  throw new Error(data.error);
                }
              } catch (parseErr) {
                console.warn('⚠️ Parse error:', parseErr.message);
              }
            }
          }
        }

        if (!receivedAnyData) {
          throw new Error('No data received from stream');
        }

      } catch (streamErr) {
        if (streamErr.name === 'AbortError') {
          console.log('⚠️ Stream aborted');
          return;
        }
        
        console.warn('⚠️ Streaming failed, falling back to non-streaming:', streamErr.message);
        
        // FALLBACK TO NON-STREAMING
        try {
          setIsStreaming(false);
          setLoadingMessage('⏳ Generating files (this may take 1-2 minutes)...');
          setStreamingText('');
          setFileCount(0);
          setCurrentFileName('');
          setGeneratedFiles([]);
          
          const res = await axios.post(
            `${API_BASE_URL}/api/project/final-build`,
            {
              projectId: projectData._id,
              answers: answers || {},
              theme: theme || {},
            },
            {
              timeout: 150000,
              signal: abortControllerRef.current.signal
            }
          );

          if (res.data && res.data.success && res.data.files) {
            console.log('✅ Files received via non-streaming:', res.data.files.length);
            setProjectFiles(res.data.files);
            if (res.data.files.length > 0) {
              setSelectedFile({ 
                name: res.data.files[0].filename.split('/').pop(), 
                content: res.data.files[0].content, 
                fullPath: res.data.files[0].filename 
              });
            }
            setError(null);
          } else {
            throw new Error("Failed to generate files - invalid response");
          }
        } catch (fallbackErr) {
          if (fallbackErr.name === 'AbortError' || fallbackErr.name === 'CanceledError') {
            console.log('⚠️ Fallback request aborted');
            return;
          }
          throw fallbackErr;
        }
      } finally {
        setLoading(false);
        setStreamingText('');
        setCurrentFileName('');
        setFileCount(0);
        setIsStreaming(false);
        setGeneratedFiles([]);
      }
    };

    buildProjectWithStreaming().catch(err => {
      console.error("❌ Build error:", err);
      
      let errorMessage = "Failed to generate project files";
      if (err.code === 'ECONNABORTED') {
        errorMessage = "Request timeout. Please try again.";
      } else if (err.response) {
        errorMessage = err.response.data?.error || `Server error: ${err.response.status}`;
      } else if (err.request) {
        errorMessage = "No response from server. Check if backend is running.";
      } else {
        errorMessage = err.message || "Unknown error";
      }

      setError(errorMessage);
      setLoading(false);
      setIsStreaming(false);
    });
    
    return () => {
      if (abortControllerRef.current) {
        console.log("🧹 Cleanup: aborting request");
        abortControllerRef.current.abort();
      }
    };
  }, [projectData?._id, answers, theme, projectFiles.length, setProjectFiles]);

  const handleRetry = () => {
    fetchedRef.current = false;
    setError(null);
    setLoading(false);
    setProjectFiles([]);
    setStreamingText('');
    setFileCount(0);
    setCurrentFileName('');
    setIsStreaming(false);
    setGeneratedFiles([]);
  };

  const handleDownloadAll = () => {
    if (!projectFiles || projectFiles.length === 0) return;

    projectFiles.forEach((file, index) => {
      setTimeout(() => {
        const blob = new Blob([file.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.filename.replace(/\//g, '_');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, index * 100);
    });
  };

  const handleDownloadFile = (file) => {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.fullPath.replace(/\//g, '_');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyCode = () => {
    if (selectedFile && selectedFile.content) {
      navigator.clipboard.writeText(selectedFile.content);
      alert('Code copied to clipboard!');
    }
  };

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;500;600;700&display=swap');
    
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
    
    @keyframes blink {
      0%, 49% { opacity: 1; }
      50%, 100% { opacity: 0; }
    }
    
    @keyframes gradient-shift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .gradient-text {
      background: linear-gradient(135deg, #AE9A64 0%, #C0B084 50%, #AE9A64 100%);
      background-size: 200% 200%;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: gradient-shift 3s ease infinite;
    }
    
    .form-button {
      padding: 16px 32px;
      border: none;
      border-radius: 50px;
      background: linear-gradient(135deg, #AE9A64 0%, #C0B084 100%);
      color: #212121;
      font-size: 1.05rem;
      font-weight: 600;
      font-family: 'Exo 2', sans-serif;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(174, 154, 100, 0.3);
    }
    
    .form-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(174, 154, 100, 0.4);
    }
    
    .secondary-button {
      padding: 14px 28px;
      border: 2px solid #AE9A64;
      background: transparent;
      border-radius: 50px;
      color: #AE9A64;
      font-size: 1rem;
      font-weight: 600;
      font-family: 'Exo 2', sans-serif;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .secondary-button:hover {
      background-color: rgba(174, 154, 100, 0.1);
      transform: translateY(-2px);
    }
    
    .vscode-container {
      display: flex;
      height: 600px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
      background-color: #1e1e1e;
    }
    
    .vscode-sidebar {
      width: 280px;
      background-color: #252526;
      border-right: 1px solid #3e3e42;
      overflow-y: auto;
      padding: 12px 0;
    }
    
    .vscode-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      background-color: #1e1e1e;
    }
    
    .vscode-tab {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 20px;
      background-color: #2d2d30;
      border-bottom: 1px solid #3e3e42;
      color: #E5E5E5;
      font-family: monospace;
      font-size: 0.875rem;
    }
    
    .vscode-editor {
      flex: 1;
      padding: 20px;
      background-color: #1e1e1e;
      color: #D4D4D4;
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
      line-height: 1.6;
      overflow-y: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    
    .streaming-text {
      font-family: 'Courier New', monospace;
      font-size: 0.8125rem;
      color: #C0B084;
      white-space: pre-wrap;
      max-height: 350px;
      overflow-y: auto;
      line-height: 1.6;
      position: relative;
    }
    
    .streaming-text::after {
      content: '▊';
      animation: blink 1s step-end infinite;
      color: #AE9A64;
      margin-left: 2px;
    }
    
    .file-badge {
      display: inline-block;
      padding: 4px 12px;
      margin: 4px;
      background: rgba(174, 154, 100, 0.15);
      border: 1px solid rgba(174, 154, 100, 0.3);
      border-radius: 20px;
      font-size: 0.75rem;
      color: #C0B084;
      animation: slideIn 0.3s ease-out;
    }
    
    ::-webkit-scrollbar {
      width: 10px;
      height: 10px;
    }
    
    ::-webkit-scrollbar-track {
      background: #1e1e1e;
    }
    
    ::-webkit-scrollbar-thumb {
      background: #424242;
      border-radius: 5px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: #4e4e4e;
    }
  `;

  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <CodeRainAnimation />
        <div style={{ maxWidth: '950px', margin: '0 auto', backgroundColor: '#2a2a2a', padding: '48px 40px', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', fontFamily: 'Exo 2, sans-serif', animation: 'fadeInUp 0.6s ease-out' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 className="gradient-text" style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '12px', textAlign: 'center', letterSpacing: '1px' }}>
              {isStreaming ? '🌊 Building Your Project in Real-Time...' : loadingMessage}
            </h2>
            <p style={{ color: '#8A8A8A', textAlign: 'center', fontWeight: '300', fontSize: '1.125rem', animation: 'pulse 1.5s ease-in-out infinite' }}>
              {loadingMessage}
            </p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
            <div style={{ width: '80px', height: '80px', border: '5px solid rgba(174, 154, 100, 0.2)', borderTop: '5px solid #AE9A64', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '24px' }}></div>
            
            {fileCount > 0 && (
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <p style={{ fontSize: '1.75rem', color: '#C0B084', fontWeight: '700', marginBottom: '12px' }}>
                  ⚡ {fileCount} files generated so far!
                </p>
                {currentFileName && (
                  <p style={{ fontSize: '0.9375rem', color: '#8A8A8A', fontWeight: '400', marginBottom: '16px' }}>
                    Currently generating: <span style={{ color: '#AE9A64', fontFamily: 'monospace', fontWeight: '600' }}>{currentFileName}</span>
                  </p>
                )}
                
                {generatedFiles.length > 0 && (
                  <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', maxHeight: '120px', overflowY: 'auto', padding: '8px' }}>
                    {generatedFiles.slice(-8).map((filename, idx) => (
                      <span key={idx} className="file-badge" style={{ animationDelay: `${idx * 0.1}s` }}>
                        📄 {filename.split('/').pop()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {streamingText && isStreaming && (
              <div style={{ marginTop: '24px', padding: '24px', backgroundColor: 'rgba(174, 154, 100, 0.05)', borderRadius: '12px', width: '100%', border: '1px solid rgba(174, 154, 100, 0.2)' }}>
                <p style={{ fontSize: '0.875rem', color: '#C0B084', marginBottom: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ animation: 'pulse 1s ease-in-out infinite' }}>🔥</span>
                  Live Code Generation:
                </p>
                <div className="streaming-text">
                  {streamingText}
                </div>
              </div>
            )}
            
            <div style={{ marginTop: '32px', width: '100%', maxWidth: '700px' }}>
              <div style={{ backgroundColor: 'rgba(174, 154, 100, 0.1)', borderLeft: '4px solid #AE9A64', padding: '20px', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.875rem', color: '#C0B084', marginBottom: '12px' }}>
                  <span style={{ fontWeight: '600' }}>💡 What's happening right now:</span>
                </p>
                <ul style={{ marginTop: '12px', fontSize: '0.875rem', color: '#8A8A8A', display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '20px', fontWeight: '300' }}>
                  {isStreaming ? (
                    <>
                      <li>✨ AI is writing complete, production-ready code</li>
                      <li>🎨 Applying your theme and style preferences</li>
                      <li>🔧 Creating backend and frontend structure</li>
                      <li>📦 Adding all necessary configurations</li>
                      <li>⚡ Each file appears as it's generated!</li>
                    </>
                  ) : (
                    <>
                      <li>🤖 Connecting to AI...</li>
                      <li>⏳ This may take 1-2 minutes</li>
                      <li>☕ Please wait while we build your project</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <style>{styles}</style>
        <CodeRainAnimation />
        <div style={{ maxWidth: '700px', margin: '0 auto', backgroundColor: '#2a2a2a', padding: '48px 40px', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', fontFamily: 'Exo 2, sans-serif', animation: 'fadeInUp 0.6s ease-out' }}>
          <h2 className="gradient-text" style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '24px', textAlign: 'center', letterSpacing: '1px' }}>
            Oops! Something went wrong 😕
          </h2>
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #F87171', color: '#F87171', padding: '16px 24px', borderRadius: '8px', marginBottom: '24px' }}>
            <p style={{ fontWeight: '600', fontSize: '1.125rem', marginBottom: '8px' }}>Error</p>
            <p style={{ fontWeight: '300' }}>{error}</p>
          </div>
          <button
            onClick={handleRetry}
            className="form-button"
            style={{ width: '100%' }}
          >
            🔄 Try Again
          </button>
        </div>
      </>
    );
  }

  if (!projectFiles || projectFiles.length === 0) {
    return (
      <>
        <style>{styles}</style>
        <CodeRainAnimation />
        <div style={{ maxWidth: '700px', margin: '0 auto', backgroundColor: '#2a2a2a', padding: '48px 40px', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', fontFamily: 'Exo 2, sans-serif' }}>
          <h2 className="gradient-text" style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '16px', textAlign: 'center', letterSpacing: '1px' }}>
            Generating Your Project Files...
          </h2>
          <p style={{ color: '#8A8A8A', textAlign: 'center' }}>Please wait while we create your project structure.</p>
        </div>
      </>
    );
  }

  const fileTree = buildFileTree(projectFiles);

  return (
    <>
      <style>{styles}</style>
      <CodeRainAnimation />
      
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px', fontFamily: 'Exo 2, sans-serif', animation: 'fadeInUp 0.6s ease-out' }}>
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <h2 className="gradient-text" style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '12px', letterSpacing: '1px' }}>
            🎉 Your Project is Ready!
          </h2>
          <p style={{ color: '#8A8A8A', fontSize: '1rem', fontWeight: '300', marginBottom: '24px' }}>
            {projectFiles.length} files generated successfully
          </p>
          
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={handleDownloadAll} className="form-button">
              📥 Download All Files
            </button>
            {selectedFile && (
              <button onClick={handleCopyCode} className="secondary-button">
                📋 Copy Current File
              </button>
            )}
          </div>
        </div>

        <div className="vscode-container">
          <div className="vscode-sidebar">
            <div style={{ padding: '8px 16px', color: '#8A8A8A', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Project Files
            </div>
            {Object.keys(fileTree).map((key) => (
              <FileTreeNode
                key={key}
                name={key}
                node={fileTree[key]}
                level={0}
                onFileSelect={setSelectedFile}
                selectedFile={selectedFile}
              />
            ))}
          </div>

          <div className="vscode-content">
            {selectedFile ? (
              <>
                <div className="vscode-tab">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{selectedFile.name}</span>
                    <span style={{ fontSize: '0.75rem', color: '#8A8A8A' }}>
                      {selectedFile.fullPath}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDownloadFile(selectedFile)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#AE9A64',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(174, 154, 100, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    💾 Download
                  </button>
                </div>
                <div className="vscode-editor">
                  {selectedFile.content}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8A8A8A', fontSize: '1.125rem' }}>
                Select a file to view its content
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: '32px', padding: '24px', backgroundColor: 'rgba(174, 154, 100, 0.1)', borderRadius: '12px', border: '1px solid rgba(174, 154, 100, 0.2)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#C0B084', marginBottom: '16px' }}>
            🚀 Next Steps
          </h3>
          <ol style={{ color: '#8A8A8A', fontSize: '0.9375rem', lineHeight: '1.8', paddingLeft: '24px' }}>
            <li>Download all files using the button above</li>
            <li>Extract the files to your desired location</li>
            <li>Open the project in your code editor (VS Code recommended)</li>
            <li>Install dependencies: <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '4px', color: '#AE9A64' }}>npm install</code></li>
            <li>Configure your <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '4px', color: '#AE9A64' }}>.env</code> file with your credentials</li>
            <li>Start the development server: <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '4px', color: '#AE9A64' }}>npm start</code></li>
            <li>Check the README.md file for detailed instructions</li>
          </ol>
        </div>

        <div style={{ marginTop: '24px', padding: '20px', backgroundColor: 'rgba(46, 160, 67, 0.1)', borderRadius: '8px', border: '1px solid rgba(46, 160, 67, 0.3)', textAlign: 'center' }}>
          <p style={{ color: '#4ade80', fontSize: '1rem', fontWeight: '500' }}>
            ✅ Project successfully generated! Happy coding! 🎊
          </p>
        </div>
      </div>
    </>
  );
};

export default ProjectFilesDisplay;