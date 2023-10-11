import psycopg2
import psycopg2.extensions
import psycopg2.errors

from string import Template

# defaults
DEFAULTS = dict(
    db_port='5432',

    db_name='sfa_dev',

    django_user='sfa_dev',
    django_pass=None,

    hasura_user='sfa_dev_hasura',
    hasura_pass=None,

    root_user='postgres',
)
DB_TEMPLATE_CREATE = '''CREATE DATABASE $db_name;
'''

DB_TEMPLATE_1 = '''CREATE USER $django_user WITH ENCRYPTED PASSWORD '$django_pass';
CREATE USER $hasura_user WITH ENCRYPTED PASSWORD '$hasura_pass';
'''

DB_TEMPLATE_2 = '''
CREATE EXTENSION pgcrypto;  -- should be already enabled on AWS

GRANT ALL ON DATABASE $db_name TO $django_user;

-- grants schema creation rights too, necessary for metadata storage
GRANT ALL ON DATABASE $db_name TO $hasura_user;

-- prevent hasura (or anyone) from creating new tables in public schema
REVOKE CREATE ON schema public FROM public;

-- allow hasura to select from public schema
GRANT USAGE ON schema public TO $hasura_user;

-- allow django to create new tables in public schema
GRANT CREATE ON schema public TO $django_user;
GRANT USAGE ON schema public TO $django_user;

-- allow hasura to select data on any existing objects
GRANT ALL ON ALL TABLES IN SCHEMA public TO $hasura_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO $hasura_user;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO $hasura_user;

-- alter default permissions when new objects are created
GRANT $django_user TO $root_user;
ALTER DEFAULT PRIVILEGES FOR ROLE $django_user IN SCHEMA public GRANT ALL ON TABLES TO $hasura_user;
ALTER DEFAULT PRIVILEGES FOR ROLE $django_user IN SCHEMA public GRANT ALL ON SEQUENCES TO $hasura_user;
ALTER DEFAULT PRIVILEGES FOR ROLE $django_user IN SCHEMA public GRANT ALL ON FUNCTIONS TO $hasura_user;
ALTER DEFAULT PRIVILEGES FOR ROLE $django_user IN SCHEMA public GRANT ALL ON TYPES TO $hasura_user;
ALTER DEFAULT PRIVILEGES FOR ROLE $django_user GRANT USAGE ON SCHEMAS TO $hasura_user;
REVOKE $django_user FROM $root_user;

'''


def db_connect(host, port, user, password, dbname='template1'):
    connection = psycopg2.connect(host=host, port=port, dbname=dbname, user=user, password=password)
    connection.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)

    return connection


def main():

    db_host = input('Enter DB host in format "localhost[:5432]" ')
    db_port = DEFAULTS['db_port']
    if ':' in db_host:
        db_port = db_host[db_host.index(':') + 1:]
        db_host = db_host[:db_host.index(':')]
    if not db_host:
        db_host = 'localhost'
    root_user = input('Enter DB root user name [%s] ' % DEFAULTS['root_user'])
    if not root_user:
        root_user = DEFAULTS['root_user']

    root_password = input('Enter DB root root password ')
    print('Attempting connection...')
    connection = db_connect(host=db_host, port=db_port, user=root_user, password=root_password)
    with connection.cursor() as cursor:
        db_name = input('Enter name of Database to be created [%s]' % DEFAULTS['db_name'])
        if not db_name:
            db_name = DEFAULTS['db_name']
        sql = Template(DB_TEMPLATE_CREATE).substitute(db_name=db_name)
        print('\nexecuting %s' % sql)
        try:
            cursor.execute(sql)
        except psycopg2.errors.DuplicateDatabase:
            print('WARNING: DATABASE ALREADY EXISTS')
    connection.close()

    # reconnect
    connection = db_connect(host=db_host, port=db_port, user=root_user, password=root_password, dbname=db_name)
    with connection.cursor() as cursor:
        django_user = input('Enter username for django [%s] ' % DEFAULTS['django_user'])
        if not django_user:
            django_user = DEFAULTS['django_user']
        while True:
            django_pass = input('Enter password for Django ')
            if not django_pass:
                print('ERROR: Django password cannot be empty')
            else:
                break
        while True:
            hasura_user = input('Enter username for Hasura [%s] ' % DEFAULTS['hasura_user'])
            if not hasura_user:
                hasura_user = DEFAULTS['hasura_user']
            if hasura_user.lower() == django_user.lower():
                print('ERROR: Hasura user must be different from Django user')
                continue
            break

        while True:
            hasura_pass = input('Enter password for Hasura ')
            if not hasura_pass:
                print('ERROR: Hasura password cannot be empty')
            else:
                break
        subs = {
            'django_user': django_user,
            'hasura_user': hasura_user,
            'django_pass': django_pass,
            'hasura_pass': hasura_pass,
            'root_user': root_user,
            'db_name': db_name,
        }

        sql = Template(DB_TEMPLATE_1).substitute(subs)
        print('\nexecuting %s' % sql)
        try:
            cursor.execute(sql)
        except psycopg2.errors.DuplicateObject:
            print('WARNING: USER(S) ALREADY EXIST')

        sql = Template(DB_TEMPLATE_2).substitute(subs)
        print('\nexecuting %s' % sql)
    connection.close()


if __name__ == '__main__':
    main()
