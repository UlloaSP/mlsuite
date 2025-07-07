import { useEffect, useState } from 'react';
import './Home.css';

const Home = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    // Animación de entrada del título
    setTimeout(() => setShowWelcome(true), 500);

    // Verificar si hay token en URL (callback de OAuth2)
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    const urlUser = urlParams.get('user');
    
    if (urlToken && urlUser) {
      setToken(urlToken);
      setUser(urlUser);
      // Limpiar URL sin recargar la página
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleGitHubLogin = () => {
    setIsLoading(true);
    // Redirigir a GitHub OAuth2
    window.location.href = 'http://localhost:8080/oauth2/authorization/github';
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
  };

  const copyToken = () => {
    navigator.clipboard.writeText(token);
    // Mostrar notificación temporal
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.textContent = '✅ Token copiado al portapapeles!';
    document.body.appendChild(notification);
    
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 2000);
  };

  return (
    <div className="home-container">
      {/* Fondo animado */}
      <div className="animated-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      {/* Contenido principal */}
      <div className="home-content">
        <div className={`welcome-section ${showWelcome ? 'animate-in' : ''}`}>
          <h1 className="main-title">
            <span className="ml-text">ML</span>
            <span className="suite-text">Suite</span>
          </h1>
          <p className="subtitle">
            Plataforma de Machine Learning de última generación
          </p>
        </div>

        {!user ? (
          <div className="login-section">
            <div className="login-card">
              <h2>🔐 Iniciar Sesión</h2>
              <p>Conecta con tu cuenta de GitHub para comenzar</p>
              
              <button 
                className={`github-login-btn ${isLoading ? 'loading' : ''}`}
                onClick={handleGitHubLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="spinner"></div>
                    Conectando...
                  </>
                ) : (
                  <>
                    <svg className="github-icon" viewBox="0 0 24 24">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                    </svg>
                    Continuar con GitHub
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="user-section">
            <div className="success-card">
              <div className="success-header">
                <div className="success-icon">✅</div>
                <h2>¡Bienvenido, {user}!</h2>
              </div>
              
              <div className="user-info">
                <p>Autenticación exitosa mediante GitHub OAuth2</p>
                
                <div className="token-section">
                  <h3>🔑 Tu Token JWT</h3>
                  <div className="token-display">
                    <code>{token.substring(0, 50)}...</code>
                    <button className="copy-btn" onClick={copyToken}>
                      📋 Copiar
                    </button>
                  </div>
                  <p className="token-info">
                    Este token es válido por 24 horas y te permite acceder a la API
                  </p>
                </div>

                <div className="actions">
                  <button className="logout-btn" onClick={handleLogout}>
                    🚪 Cerrar Sesión
                  </button>
                  <button className="explore-btn">
                    🚀 Explorar Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
