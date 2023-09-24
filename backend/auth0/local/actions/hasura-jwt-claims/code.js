/**
* Handler that will be called during the execution of a PostLogin flow.
*
* @param {Event} event - Details about the user and the context in which they are logging in.
* @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
*/
exports.onExecutePostLogin = async (event, api) => {
   const namespace = "https://hasura.io/jwt/claims";

  if (event.authorization) {
    const allowedRoles = event.authorization.roles?.length ? event.authorization.roles : ['investor'];
    api.accessToken.setCustomClaim(namespace, {
      'x-hasura-default-role': allowedRoles[0],
      'x-hasura-allowed-roles': allowedRoles,
      'x-hasura-user-id': event.user.user_id
    });
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
