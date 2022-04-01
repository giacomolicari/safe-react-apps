const getIframeDocument = () => {
  return (
    cy
      .get('iframe[title="Transaction Builder"]')
      // Cypress yields jQuery element, which has the real
      // DOM element under property "0".
      // From the real DOM iframe element we can get
      // the "document" element, it is stored in "contentDocument" property
      // Cypress "its" command can access deep properties using dot notation
      // https://on.cypress.io/its
      .its('0.contentDocument')
      .should('exist')
  );
};

const getIframeBody = () => {
  // get the document
  return (
    getIframeDocument()
      // automatically retries until body is loaded
      .its('body')
      .should('not.be.undefined')
      // wraps "body" DOM element to allow
      // chaining more Cypress commands, like ".find(...)"
      .then(cy.wrap)
  );
};

describe('Create Safe', () => {
  it('should create a new safe', () => {
    cy.visit('app/rin:0x7c90da666E6827E05D045713089e6CB22C58c40B/apps?appUrl=http://localhost:3001/tx-builder');
    cy.contains('a', 'Accept all').click({ force: true });
    cy.contains('button', 'Confirm').click({ force: true });
    getIframeBody().find('#address').type('0x49d4450977E2c95362C13D3a31a09311E0Ea26A6');
    // cy.get("p").contains("Ethereum").click({ force: true });
    // cy.get("p").contains("Rinkeby").click({ force: true });
    // cy.contains("Not Connected").click({ force: true });
    // cy.contains("button", "Connect").click({ force: true });
    // cy.contains("MetaMask").click({force: true});
    // cy.acceptMetamaskAccess();
    // cy.get("[data-testid=connected-wallet]").should("contain", "MetaMask");
    // cy.contains("Create new Safe").click({ force: true });
    // cy.contains("Continue").click();
    // cy.get("[data-testid=create-safe-name-field]").type("Test Safe");
    // cy.contains("button", "Continue").click({ force: true });
    // cy.contains("button", "Continue").click({ force: true });
    // cy.contains("button", "Create").click({ force: true });
    // cy.confirmMetamaskTransaction({gasLimit: 523170});
    // cy.contains("Your Safe was created successfully", { timeout: 60000});
  });
});
