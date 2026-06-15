module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
  plugins: [
    // Reemplaza import.meta.env (Vite-specific) por un objeto compatible con Jest
    function importMetaEnvTransform({ types: t }) {
      return {
        visitor: {
          MetaProperty(path) {
            if (
              path.get('meta').isIdentifier({ name: 'import' }) &&
              path.get('property').isIdentifier({ name: 'meta' })
            ) {
              path.replaceWith(
                t.objectExpression([
                  t.objectProperty(
                    t.identifier('env'),
                    t.objectExpression([
                      t.objectProperty(
                        t.stringLiteral('VITE_BACKEND_URL'),
                        t.stringLiteral('http://localhost:3000')
                      ),
                      t.objectProperty(
                        t.stringLiteral('MODE'),
                        t.stringLiteral('test')
                      ),
                    ])
                  ),
                ])
              );
            }
          },
        },
      };
    },
  ],
};
