const axios = require('axios');
/**
* Handler that will be called during the execution of a PostLogin flow.
*
* @param {Event} event - Details about the user and the context in which they are logging in.
* @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
*/
exports.onExecutePostLogin = async (event, api) => {
  const userId = event.user.user_id;
  const userEmail = event.user.email;
  const {client:{client_id}, secrets} = event;

  let admin_secret = null, url = null;
  //
	if(client_id === secrets.dev_client_Id || client_id === secrets.dev_admin_app_client_id) {
    admin_secret = secrets.dev_gql_admin_secret;
    url = secrets.dev_gql_endpoint;
  } else if(client_id === secrets.staging_client_Id) {
    admin_secret = secrets.staging_gql_admin_secret;
    url = secrets.staging_gql_endpoint;
  }
  
  const query = `mutation($userId: String!, $userEmail: String) {
    insert_users_user(objects: [{
      auth0id: $userId, email: $userEmail, last_seen: "now()"
    }], on_conflict: {constraint: users_user_pkey, update_columns: [last_seen, email]}
    ) {
      affected_rows
    }
  }`;

  const variables = { userId, userEmail };

  if(admin_secret && url) axios.post(url, {
      query: query,
      variables: variables
    }, {
    headers: {
      'content-type' : 'application/json', 
      'x-hasura-admin-secret': admin_secret
      },
  })};


/**
* Handler that will be invoked when this action is resuming after an external redirect. If your
* onExecutePostLogin function does not perform a redirect, this function can be safely ignored.
*
* @param {Event} event - Details about the user and the context in which they are logging in.
* @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
*/
// exports.onContinuePostLogin = async (event, api) => {
// };
