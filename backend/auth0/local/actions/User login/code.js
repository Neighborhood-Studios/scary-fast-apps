const axios = require('axios');
const { ManagementClient } = require('auth0');
const Sentry = require('@sentry/node');
/*
secrets
 Frontend applications:
  APP_CLIENT_ID -- Application Client ID
  ADMIN_APP_CLIENT_ID -- Admin Panel application Client ID

 GraphQL:
  GQL_ENDPOINT -- GraphQL endpoint to update user and employee records
  GQL_ADMIN_KEY -- Hasura admin user secret key

 Management application (auth0 management application to update auth0 user):
  MANAGEMENT_APP_DOMAIN -- management application Domain
  MANAGEMENT_APP_CLIENT_ID -- management application Client ID
  MANAGEMENT_APP_SECRET -- management application Client Secret

 Sentry integration:
  SENTRY_DSN -- Sentry DSN value
  SENTRY_ENVIRONMENT -- environment value: development, staging or production
 */

const ALLOWED_DOMAINS = ['<PROJECT_NAME>.com'];
const CLIENT_USER_ROLE_NAME = 'user';

/**
 * Handler that will be called during the execution of a PostLogin flow.
 *
 * @param {Event} event - Details about the user and the context in which they are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
 */

exports.onExecutePostLogin = async (event, api) => {
    const {
        secrets,
        user: { user_id, email = '', user_metadata },
        client: { client_id, name: client_name },
        authorization,
        tenant,
    } = event;
    const userRoles = authorization?.roles ?? [];

    const management = new ManagementClient({
        domain: secrets.MANAGEMENT_APP_DOMAIN,
        clientId: secrets.MANAGEMENT_APP_CLIENT_ID,
        clientSecret: secrets.MANAGEMENT_APP_SECRET,
    });

    Sentry.init({
        dsn: secrets.SENTRY_DSN,
        environment: secrets.SENTRY_ENVIRONMENT,
        initialScope: {
            tags: { tenant: tenant.id, app: client_name },
            user: { id: user_id, email: email },
        },
    });

    const gqlRequest = (data) =>
        axios
            .post(secrets.GQL_ENDPOINT, data, {
                headers: {
                    'content-type': 'application/json',
                    'x-hasura-admin-secret': secrets.GQL_ADMIN_KEY,
                },
            })
            .then(({ data }) => {
                if (data.data) return data.data;
                if (data.errors)
                    return Promise.reject(data.errors.map((error) => error.message).join(','));
            })
            .catch((error) => {
                Sentry.captureException(error);
                let errorMsg = 'Authorization error occured';
                if (typeof error === 'string') errorMsg = error;
                else if (error.response) errorMsg = error.response.status;
                else if (error.message) errorMsg = error.message;
                api.access.deny(errorMsg);
            });

    let denied,
        /** @type {(string|null)} */
        role = userRoles[0];

    if (client_id === secrets.ADMIN_APP_CLIENT_ID) {
        try {
            ({ role, denied } = await employeeFlow(event));
        } catch (error) {
            Sentry.captureException(error);
        }
    }

    if (client_id === secrets.APP_CLIENT_ID) {
        try {
            ({ role, denied } = await userFlow(event));
        } catch (error) {
            Sentry.captureException(error);
        }
    }

    if (denied) {
        api.access.deny(denied);
        return;
    }

    //sync Hasura User
    gqlRequest({
        query: syncUserMutation,
        variables: {
            user_id,
            email,
        },
    });

    //set user custom claims
    if (event.request.hostname) {
        api.idToken.setCustomClaim(event.request.hostname, {
            roles: [role],
            user_metadata,
        });
    }

    //set Hasura Headers
    if (role) {
        const namespace = 'https://hasura.io/jwt/claims';
        api.accessToken.setCustomClaim(namespace, {
            'x-hasura-default-role': role,
            'x-hasura-allowed-roles': [role],
            'x-hasura-user-id': user_id,
        });
    }

    /**
     *
     * @param {Event} event
     * @returns {Promise<{role: string, denied: (undefined|string)}>}
     */
    async function employeeFlow(event) {
        const {
            user: { user_id, email = '', given_name, family_name },
            stats: { logins_count },
        } = event;

        //check user email domain
        const regExp = new RegExp(`@(${ALLOWED_DOMAINS.join('|')})$`);
        if (!regExp.test(email)) {
            // remove just created user
            if (logins_count === 1) management.users.delete({ id: user_id });

            return { denied: 'You are not allowed to sign in.', role: '' };
        }

        //get Employee by email
        const employee = await gqlRequest({
            query: getEmployeeQuery,
            variables: { email },
        }).then((data) => data.employees[0]);

        if (!employee?.active) {
            return { denied: 'You are not allowed to sign in.', role: '' };
        }

        //assign employee role to user and remove other roles
        updateAuth0UserRole(user_id, employee.role).catch((error) =>
            Sentry.captureException(error)
        );

        //update Hasura Employee
        await gqlRequest({
            query: updateEmployeeMutations,
            variables: {
                employee_id: employee.id,
                user_id,
                first_name: given_name,
                last_name: family_name,
            },
        });

        return { role: employee.role, denied: undefined };
    }

    /**
     *
     * @param {Event} event
     * @returns {Promise<{role: (string|null), denied: (undefined|string)}>}
     */
    async function userFlow(event) {
        const {
            user: { user_id, name, phone_number, phone_verified },
        } = event;

        /** @type {(string|null)} */
        let role = CLIENT_USER_ROLE_NAME;

        //get clientUser and check if clientUser is active
        const appUser = await gqlRequest({
            query: getUserProfileQuery,
            variables: { user_id },
        }).then((data) => data?.users_user_by_pk);


        const isAuthorized = true;

        if (isAuthorized) {
            //assign 'user' role to user and remove other roles
            updateAuth0UserRole(user_id, role).catch((error) => Sentry.captureException(error));
        } else {
            // do not assign any role if not authorized
            role = null;
        }
    }

    /**
     *
     * Update user role in Auth0
     *
     * @param {string} user_id
     * @param {string} role - new role to set
     * @returns {Promise<>}
     */
    async function updateAuth0UserRole(user_id, role) {
        const [{ data: userRoles }, { data: allRoles }] = await Promise.all([
            management.users.getRoles({ id: user_id }),
            management.roles.getAll(),
        ]);
        const userRoleNames = userRoles.map(({ name }) => name);

        const { rolesToRemove, rolesToAssign } = allRoles.reduce(
            ({ rolesToRemove, rolesToAssign }, { id, name }) => {
                if (name === role && !userRoleNames.includes(name)) {
                    rolesToAssign.push(id);
                } else if (userRoleNames.includes(name) && name !== role) {
                    rolesToRemove.push(id);
                }
                return { rolesToRemove, rolesToAssign };
            },
            { rolesToRemove: [], rolesToAssign: [] }
        );

        await Promise.all([
            rolesToAssign.length &&
                management.users.assignRoles({ id: user_id }, { roles: rolesToAssign }),
            rolesToRemove.length &&
                management.users.deleteRoles({ id: user_id }, { roles: rolesToRemove }),
        ]);
    }
};

const getEmployeeQuery = `
  query GetEmployeeQuery($email: String = "") {
    employees: users_employee(where: { email: { _eq: $email } }) {
      id
      role,
      active
    }
  }
`;

const getUserProfileQuery = `
  query GetUser($user_id: String!) {
     users_user_by_pk(auth0id: $user_id) {
      phone_number
      phone_verified
    }
  }
`;

const updateEmployeeMutations = `
  mutation UpdateEmployee (
    $employee_id: bigint!
    $user_id: String!, $first_name: String = null, $last_name: String = null,
  ) {
    insert_users_user_one(object: {
      auth0id: $user_id
    }, on_conflict: {constraint: users_user_pkey, update_columns: []}) {
      __typename
    }
    
    update_users_employee_by_pk(
      pk_columns: {id: $employee_id}, 
      _set: {user_id: $user_id, first_name: $first_name, last_name: $last_name}
    ) {
      __typename
    }
  }
`;


const syncUserMutation = `
  mutation UpdateUser (
    $user_id: String!, $email: String! 
  ) {
    insert_users_user_one(object: {
      auth0id: $user_id, email: $email, last_seen: "now()"
    }, on_conflict: {constraint: users_user_pkey, update_columns: [last_seen]}
    ) {
      __typename
    }
  }
`;
