/**
* Handler that will be called during the execution of a PostLogin flow.
*
* @param {Event} event - Details about the user and the context in which they are logging in.
* @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
*/
const ADMIN_APP_CLIENT_ID = 'CHANGEME';
const ALLOWED_DOMAINS = ['intelligichain.com'];

exports.onExecutePostLogin = async (event, api) => {
  const client_id = event?.client?.client_id;
  const userEmail = event.user.email;
  //restrict registration by user email
  if(client_id === ADMIN_APP_CLIENT_ID && userEmail) {
    const regExp = new RegExp(`@(${ALLOWED_DOMAINS.join('|')})$`);

    if(!regExp.test(userEmail) ) {
      api.access.deny('You are not allowed to sign in.');

      const ManagementClient = require('auth0').ManagementClient;
      const management = new ManagementClient({
          domain: event.secrets.managemtAPI_APP_domain,
          clientId: event.secrets.managemtAPI_APP_clientID,
          clientSecret: event.secrets.managemtAPI_APP_secret,
      });
      management.users.delete({ id : event.user.user_id});
    }
  }
};


/**
* Handler that will be invoked when this action is resuming after an external redirect. If your
* onExecutePostLogin function does not perform a redirect, this function can be safely ignored.
*
* @param {Event} event - Details about the user and the context in which they are logging in.
* @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
*/
// exports.onContinuePostLogin = async (event, api) => {
// };
