describe('Create Safe', () => {
  it('should create a new safe', () => {
    cy.visit('/app/welcome');
    cy.contains('a', 'Accept all').click({ force: true });
    // cy.get("p").contains("Ethereum").click({ force: true });
    cy.get('p').contains('Rinkeby').click({ force: true });
    cy.contains('Not Connected').click({ force: true });
    cy.contains('button', 'Connect').click({ force: true });
    cy.contains('MetaMask').click({ force: true });
    cy.acceptMetamaskAccess();
    cy.get('[data-testid=connected-wallet]').should('contain', 'MetaMask');
    cy.contains('Create new Safe').click({ force: true });
    cy.contains('Continue').click();
    cy.get('[data-testid=create-safe-name-field]').type('Test Safe');
    cy.contains('button', 'Continue').click({ force: true });
    cy.contains('button', 'Continue').click({ force: true });
    cy.contains('button', 'Create').click({ force: true });
    cy.confirmMetamaskTransaction({ gasLimit: 523170 });
    cy.contains('Your Safe was created successfully', { timeout: 60000 });
  });
});
