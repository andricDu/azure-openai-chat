import Keycloak from "keycloak-js";

const keycloak = new Keycloak({
    url: "https://lab-iam.indocpilot.io",
    realm: "dev",            
    clientId: "react-app",
});

export default keycloak;
