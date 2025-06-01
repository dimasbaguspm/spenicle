{ pkgs ? import <nixpkgs> {} }:

with pkgs;
mkShell {
  buildInputs = [
    nodejs_22
    corepack_22
    postgresql_16
    git
  ];

  shellHook = ''
    echo ""
    echo ""
    echo "============================================"
    echo "Welcome to the Spenicle development environment"
    echo ""
    echo "Node.js version:"
    echo "Node.js $(node --version)"
    echo ""
    echo "PostgreSQL version:"
    echo "$(psql --version)"
    echo "============================================"
    echo ""
    echo ""

 
    export WEB_SERVICE_BASE_URL="http://localhost:3000/api"
    export WEB_PORT="8080"
    export WEB_STAGE="development"
    
    export API_PGDATA="$PWD/.direnv/postgres"
    export API_PGHOST="$PGDATA"
    export API_PGUSER="postgres"
    export API_PGDATABASE="spenicle"
    export API_PGPORT="5432"
    export API_DATABASE_URL="postgresql://$API_PGUSER@localhost:$API_PGPORT/$API_PGDATABASE"
    export API_JWT_SECRET="development_jwt_secret_key_change_in_production"
    export API_PORT="3000"
    export API_STAGE="development"

  '';
}