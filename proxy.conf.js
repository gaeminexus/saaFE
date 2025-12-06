const PROXY_CONFIG = [
  {
    context: ['/SaaBE'],
    target: 'http://127.0.0.1:8080',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    onProxyReq: function(proxyReq, req, res) {
      console.log('\x1b[36m[PROXY] Interceptando:\x1b[0m', req.method, req.url);
      console.log('\x1b[36m[PROXY] Redirigiendo a:\x1b[0m', proxyReq.path);
    },
    onProxyRes: function(proxyRes, req, res) {
      console.log('\x1b[32m[PROXY] Respuesta del backend:\x1b[0m', proxyRes.statusCode, req.url);
    },
    onError: function(err, req, res) {
      console.error('\x1b[31m[PROXY ERROR]:\x1b[0m', err.message);
      console.error('\x1b[31m[PROXY ERROR] URL:\x1b[0m', req.url);
    }
  }
];

module.exports = PROXY_CONFIG;
