# Agenda de contatos

É uma aplicação web que consome a API contact-book(https://github.com/bellonauta/contact-book-api).
Permite a inclusão, alteração e consulta a contatos da agenda.

---
## Dependências
- SAP UI5 API
- API CookContact

---
## Instalação
- Faça o clone do repositório para sua pasta para execução da aplicação.
- Coloque a URI da API, no manifest.json, na propriedade /sap.app/dataSources/contacts/uri;
- Finalmente, coloque a URL de autenticação(token) da API, no manifest.json, na propriedade 
/sap.app/dataSources/contacts/autentication/url;


---
## ToDo
- Melhorar a navegação;
- Melhorar o controle de ordenação dos contatos no grid;