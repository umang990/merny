// Home.jsx - COMPLETE
import React, { useState } from "react";
import { useRef, useEffect } from "react";
import ProjectForm from "../components/ProjectForm";
import QuestionsStep from "../components/QuestionsStep";
import ThemeSelector from "../components/ThemeSelector";
import ProjectFilesDisplay from "../components/ProjectFilesDisplay";

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
    
    const handleResize = () => { 
      if (canvas) { 
        canvas.width = window.innerWidth; 
        canvas.height = window.innerHeight; 
      } 
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => { 
      window.removeEventListener('resize', handleResize); 
      cancelAnimationFrame(animationFrameId); 
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1 }} />;
};

const Home = () => {
  const [step, setStep] = useState(1);
  const [projectData, setProjectData] = useState({});
  const [questions, setQuestions] = useState(null);
  const [answers, setAnswers] = useState({});
  const [theme, setTheme] = useState({});
  const [projectFiles, setProjectFiles] = useState([]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;500;600;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Exo 2', sans-serif;
        }
        
        body {
          background-color: #212121;
          color: #E5E5E5;
          overflow-x: hidden;
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
        
        .step-indicator {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.125rem;
          transition: all 0.3s ease;
        }
        
        .step-indicator.active {
          background: linear-gradient(135deg, #AE9A64 0%, #C0B084 100%);
          color: #212121;
          box-shadow: 0 4px 15px rgba(174, 154, 100, 0.4);
        }
        
        .step-indicator.inactive {
          background-color: rgba(138, 138, 138, 0.2);
          color: #8A8A8A;
        }
        
        .step-line {
          height: 4px;
          flex: 1;
          transition: all 0.3s ease;
          border-radius: 2px;
        }
        
        .step-line.active {
          background: linear-gradient(135deg, #AE9A64 0%, #C0B084 100%);
        }
        
        .step-line.inactive {
          background-color: rgba(138, 138, 138, 0.2);
        }
      `}</style>
      
      <div style={{ minHeight: '100vh', backgroundColor: '#212121', padding: '48px 24px', position: 'relative' }}>
        <CodeRainAnimation />
        
        <div style={{ marginBottom: '48px', textAlign: 'center', animation: 'fadeInUp 0.6s ease-out' }}>
          <h1 className="gradient-text" style={{ fontSize: '3rem', fontWeight: '700', marginBottom: '12px', letterSpacing: '2px' }}>
            MERNY Project Builder
          </h1>
          <p style={{ color: '#8A8A8A', fontSize: '1.125rem', fontWeight: '300' }}>
            AI-Powered Full Stack Development
          </p>
          
          <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', maxWidth: '800px', margin: '32px auto 0', padding: '0 16px' }}>
            {[1, 2, 3, 4].map((s) => (
              <React.Fragment key={s}>
                <div
                  className={`step-indicator ${step >= s ? 'active' : 'inactive'}`}
                >
                  {s}
                </div>
                {s !== 4 && (
                  <div
                    className={`step-line ${step > s ? 'active' : 'inactive'}`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', maxWidth: '800px', margin: '16px auto 0', padding: '0 16px' }}>
            <span style={{ fontSize: '0.875rem', color: step >= 1 ? '#C0B084' : '#6A6A6A', fontWeight: step === 1 ? '600' : '400', transition: 'all 0.3s ease' }}>
              Project
            </span>
            <span style={{ fontSize: '0.875rem', color: step >= 2 ? '#C0B084' : '#6A6A6A', fontWeight: step === 2 ? '600' : '400', transition: 'all 0.3s ease' }}>
              Questions
            </span>
            <span style={{ fontSize: '0.875rem', color: step >= 3 ? '#C0B084' : '#6A6A6A', fontWeight: step === 3 ? '600' : '400', transition: 'all 0.3s ease' }}>
              Theme
            </span>
            <span style={{ fontSize: '0.875rem', color: step >= 4 ? '#C0B084' : '#6A6A6A', fontWeight: step === 4 ? '600' : '400', transition: 'all 0.3s ease' }}>
              Files
            </span>
          </div>
        </div>

        {step === 1 && (
          <ProjectForm
            setProjectData={setProjectData}
            nextStep={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <QuestionsStep
            projectData={projectData}
            questions={questions}
            setQuestions={setQuestions}
            answers={answers}
            setAnswers={setAnswers}
            nextStep={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <ThemeSelector
            theme={theme}
            setTheme={setTheme}
            nextStep={() => setStep(4)}
          />
        )}
        {step === 4 && (
          <ProjectFilesDisplay
            projectData={projectData}
            answers={answers}
            theme={theme}
            projectFiles={projectFiles}
            setProjectFiles={setProjectFiles}
          />
        )}
      </div>
    </>
  );
};

export default Home;