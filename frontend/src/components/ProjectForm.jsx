// ProjectForm.jsx - PRODUCTION READY
import React, { useState } from "react";
import axios from "axios";
import { useRef, useEffect } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Code Rain Animation Component
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

const ProjectForm = ({ setProjectData, nextStep }) => {
  const [formData, setFormData] = useState({
    projectName: "",
    description: "",
    stack: "MERN",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/project/start`,
        formData
      );
      
      if (res.data.success && res.data.project) {
        setProjectData(res.data.project);
        nextStep();
      } else {
        setError("Failed to create project");
      }
    } catch (err) {
      console.error("Error creating project:", err);
      setError(err.response?.data?.error || "Failed to create project. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;500;600;700&display=swap');
        
        * {
          font-family: 'Exo 2', sans-serif;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }

        @keyframes gradient-shift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        .form-wrapper {
          animation: fadeInUp 0.6s ease-out;
        }

        .form-input-container {
          position: relative;
          width: 100%;
        }

        .form-input, .form-textarea, .form-select {
          width: 100%;
          border: none;
          background: transparent;
          outline: none;
          padding: 16px 16px 16px 50px;
          color: #E5E5E5;
          font-size: 1rem;
          border-bottom: 2px solid rgba(255,255,255,0.2);
          transition: all 0.3s ease;
        }

        .form-textarea {
          resize: vertical;
          min-height: 100px;
          padding: 16px;
        }

        .form-input:focus, .form-textarea:focus, .form-select:focus {
          border-bottom-color: #AE9A64;
        }

        .form-input::placeholder, .form-textarea::placeholder {
          color: #8A8A8A;
        }

        .form-input-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
          color: #8A8A8A;
          transition: color 0.3s;
          pointer-events: none;
        }

        .form-input:focus + .form-input-icon,
        .form-select:focus + .form-input-icon {
          color: #AE9A64;
        }

        .form-button {
          width: 100%;
          padding: 16px;
          border: none;
          border-radius: 50px;
          background: linear-gradient(135deg, #AE9A64 0%, #C0B084 100%);
          color: #212121;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(174, 154, 100, 0.3);
        }

        .form-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(174, 154, 100, 0.4);
        }

        .form-button:active:not(:disabled) {
          transform: scale(0.98);
        }

        .form-button:disabled {
          background: #555;
          cursor: not-allowed;
          transform: translateY(0);
          box-shadow: none;
        }

        .error-message {
          padding: 12px 16px;
          border-radius: 8px;
          background-color: rgba(239, 68, 68, 0.1);
          color: #F87171;
          font-size: 0.9rem;
          text-align: center;
          animation: fadeInUp 0.3s ease-out;
        }

        .gradient-text {
          background: linear-gradient(135deg, #AE9A64 0%, #C0B084 50%, #AE9A64 100%);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradient-shift 3s ease infinite;
        }
      `}</style>
      
      <CodeRainAnimation />
      
      <div className="form-wrapper" style={{ maxWidth: '500px', margin: '0 auto', backgroundColor: '#2a2a2a', padding: '48px 40px', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 className="gradient-text" style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '8px', letterSpacing: '1px' }}>
            Start Your MERNY Project
          </h2>
          <p style={{ color: '#8A8A8A', fontSize: '1rem', fontWeight: '300' }}>
            Let's build something amazing together! 🚀
          </p>
        </div>
        
        {error && (
          <div className="error-message" style={{ marginBottom: '24px' }}>
            <strong>Error:</strong> {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <div className="form-input-container">
            <input
              type="text"
              name="projectName"
              placeholder="Project Name"
              value={formData.projectName}
              onChange={handleChange}
              className="form-input"
              required
              minLength="3"
              maxLength="100"
            />
            <svg className="form-input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
          </div>

          <div className="form-input-container" style={{ position: 'relative' }}>
            <textarea
              name="description"
              placeholder="Describe what you want to build..."
              value={formData.description}
              onChange={handleChange}
              className="form-textarea"
              required
              minLength="10"
              maxLength="1000"
            />
          </div>

          <div className="form-input-container">
            <select
              name="stack"
              value={formData.stack}
              onChange={handleChange}
              className="form-select"
              style={{ cursor: 'pointer' }}
            >
              <option value="MERN" style={{ background: '#2a2a2a', color: '#E5E5E5' }}>MERN (MongoDB, Express, React, Node.js)</option>
              <option value="MEAN" style={{ background: '#2a2a2a', color: '#E5E5E5' }}>MEAN (MongoDB, Express, Angular, Node.js)</option>
              <option value="MEVN" style={{ background: '#2a2a2a', color: '#E5E5E5' }}>MEVN (MongoDB, Express, Vue, Node.js)</option>
            </select>
            <svg className="form-input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="form-button"
            style={{ marginTop: '8px' }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>Creating Project...</span>
              </span>
            ) : (
              "Next Step →"
            )}
          </button>
        </form>
      </div>
    </>
  );
};

export default ProjectForm;