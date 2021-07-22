# Agenda de contatos

É uma aplicação web que consome a API BookContact(https://github.com/bellonauta/BookContact).
Permite a inclusão, alteração e consulta a contatos da agenda.

---
## Dependências
- SAP UI5 API
- API CookContact

---
## Instalação
- Faça o clone do repositório para sua pasta para execução da aplicação.
- Coloque a URI da API, no manifest.json, na propriedade /sap.app/dataSources/contacts/uri;
- Coloque a URI de autenticação(token) da API, no manifest.json, na propriedade 
/sap.app/dataSources/contacts/autentication/url;
- Finalmente, coloque o nome do usuário de autenticação(token) da API, no manifest.json, na propriedade 
/sap.app/dataSources/contacts/autentication/username.

---
## ToDo
- Melhorar a navegação;
- Melhorar o controle de ordenação dos contatos no grid;