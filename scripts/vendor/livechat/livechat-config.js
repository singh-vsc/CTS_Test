// Radial LiveChat Settings
window.liveChatSettings = {
  brandCode: 'CTS', // The client's brand code
  buttonId: '5730a000000PBG6', // The button ID provided by SalesForce
  chatUrl: 'https://use.secure.force.com/ArticleSearch/apex/CTSBrandChat', // The URL that the pre-chat form will submit to
  deploymentId: '5720a000000PBEb', // The deployment ID provided by SalesForce
  deploymentScript: 'https://c.la3-c1-phx.salesforceliveagent.com/content/g/js/44.0/deployment.js', // The SalesForce deployment script
  endChat: { // Settings related to chat-end
    callback: null // A custom callback function to run when the chat session is ended by the agent or user
  },
  inChat: { // Settings related to the in-chat window
    callback: null // A custom callback function to be executed when chat starts
  },
  initUrl: 'https://d.la3-c1-phx.salesforceliveagent.com/chat', // The SalesForce initialize URL. This is used in the liveagent.init() call
  orgId: '00Dj0000000Jdpt', // The organization ID provided by SalesForce
  preChat: { // Settings related to the pre-chat window
    callback: null // A custom callback function to be executed when pre-chat starts
  }
};
