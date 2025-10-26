// ============================================
// FILE 3: ThemeSelector.jsx - STYLED VERSION
// ============================================

import React, { useState, useEffect, useRef } from "react";

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

const ThemeSelector = ({ theme, setTheme, nextStep }) => {
  const [localTheme, setLocalTheme] = useState({
    primaryColor: "#AE9A64",
    secondaryColor: "#C0B084",
    fontFamily: "Exo 2",
    style: "modern",
  });

  const handleChange = (key, value) => {
    setLocalTheme({ ...localTheme, [key]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setTheme(localTheme);
    nextStep();
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;500;600;700&display=swap');
        
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
        
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .gradient-text {
          background: linear-gradient(135deg, #AE9A64 0%, #C0B084 50%, #AE9A64 100%);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradient-shift 3s ease infinite;
        }
        
        .form-input, .form-select {
          width: 100%;
          border: 2px solid rgba(255, 255, 255, 0.2);
          background: transparent;
          outline: none;
          padding: 12px 16px;
          color: #E5E5E5;
          font-size: 1rem;
          font-family: 'Exo 2', sans-serif;
          border-radius: 8px;
          transition: all 0.3s ease;
        }
        
        .form-input:focus, .form-select:focus {
          border-color: #AE9A64;
          background-color: rgba(174, 154, 100, 0.05);
        }
        
        .color-picker {
          width: 80px;
          height: 80px;
          border: 3px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .color-picker:hover {
          border-color: #AE9A64;
          transform: scale(1.05);
        }
        
        .style-option {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          border-radius: 12px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          cursor: pointer;
          transition: all 0.3s ease;
          background-color: rgba(42, 42, 42, 0.6);
        }
        
        .style-option:hover {
          border-color: rgba(174, 154, 100, 0.3);
          background-color: rgba(42, 42, 42, 0.8);
        }
        
        .style-option.selected {
          border-color: #AE9A64;
          background-color: rgba(174, 154, 100, 0.15);
        }
        
        .form-button {
          width: 100%;
          padding: 18px;
          border: none;
          border-radius: 50px;
          background: linear-gradient(135deg, #AE9A64 0%, #C0B084 100%);
          color: #212121;
          font-size: 1.1rem;
          font-weight: 600;
          font-family: 'Exo 2', sans-serif;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(174, 154, 100, 0.3);
        }
        
        .form-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(174, 154, 100, 0.4);
        }
        
        .form-button:active {
          transform: scale(0.98);
        }
      `}</style>
      
      <CodeRainAnimation />
      
      <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#2a2a2a', padding: '48px 40px', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', fontFamily: 'Exo 2, sans-serif', animation: 'fadeInUp 0.6s ease-out' }}>
        <h2 className="gradient-text" style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '8px', textAlign: 'center', letterSpacing: '1px' }}>
          Choose Your Theme 🎨
        </h2>
        <p style={{ color: '#8A8A8A', marginBottom: '32px', textAlign: 'center', fontWeight: '300', fontSize: '1rem' }}>
          Customize the look and feel of your project
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#8A8A8A', marginBottom: '12px' }}>
              Primary Color
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <input
                type="color"
                value={localTheme.primaryColor}
                onChange={(e) => handleChange("primaryColor", e.target.value)}
                className="color-picker"
              />
              <input
                type="text"
                value={localTheme.primaryColor}
                onChange={(e) => handleChange("primaryColor", e.target.value)}
                className="form-input"
                placeholder="#AE9A64"
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#8A8A8A', marginBottom: '12px' }}>
              Secondary Color
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <input
                type="color"
                value={localTheme.secondaryColor}
                onChange={(e) => handleChange("secondaryColor", e.target.value)}
                className="color-picker"
              />
              <input
                type="text"
                value={localTheme.secondaryColor}
                onChange={(e) => handleChange("secondaryColor", e.target.value)}
                className="form-input"
                placeholder="#C0B084"
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#8A8A8A', marginBottom: '12px' }}>
              Font Family
            </label>
            <select
              value={localTheme.fontFamily}
              onChange={(e) => handleChange("fontFamily", e.target.value)}
              className="form-select"
            >
              <option value="Exo 2" style={{ background: '#2a2a2a', color: '#E5E5E5' }}>Exo 2</option>
              <option value="Inter" style={{ background: '#2a2a2a', color: '#E5E5E5' }}>Inter</option>
              <option value="Roboto" style={{ background: '#2a2a2a', color: '#E5E5E5' }}>Roboto</option>
              <option value="Poppins" style={{ background: '#2a2a2a', color: '#E5E5E5' }}>Poppins</option>
              <option value="Montserrat" style={{ background: '#2a2a2a', color: '#E5E5E5' }}>Montserrat</option>
              <option value="Open Sans" style={{ background: '#2a2a2a', color: '#E5E5E5' }}>Open Sans</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#8A8A8A', marginBottom: '12px' }}>
              Design Style
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {["modern", "minimal", "playful", "professional"].map((style) => (
                <label
                  key={style}
                  className={`style-option ${localTheme.style === style ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="style"
                    value={style}
                    checked={localTheme.style === style}
                    onChange={(e) => handleChange("style", e.target.value)}
                    style={{ marginRight: '8px', width: '16px', height: '16px', accentColor: '#AE9A64', cursor: 'pointer' }}
                  />
                  <span style={{ textTransform: 'capitalize', fontWeight: '500', color: localTheme.style === style ? '#C0B084' : '#8A8A8A' }}>
                    {style}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ backgroundColor: 'rgba(42, 42, 42, 0.8)', padding: '24px', borderRadius: '12px', border: '2px solid rgba(255, 255, 255, 0.1)' }}>
            <h3 style={{ fontWeight: '600', marginBottom: '16px', color: '#C0B084', fontSize: '1.125rem' }}>Preview</h3>
            <div
              style={{
                padding: '24px',
                borderRadius: '12px',
                backgroundColor: localTheme.primaryColor,
                fontFamily: localTheme.fontFamily,
                transition: 'all 0.3s ease'
              }}
            >
              <p style={{ color: '#ffffff', fontWeight: '700', fontSize: '1.5rem', marginBottom: '12px' }}>Your Project Title</p>
              <button
                type="button"
                style={{
                  marginTop: '8px',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: localTheme.secondaryColor,
                  color: '#212121',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                Sample Button
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="form-button"
            style={{ marginTop: '8px' }}
          >
            Generate Project Files →
          </button>
        </form>
      </div>
    </>
  );
};

export default ThemeSelector;