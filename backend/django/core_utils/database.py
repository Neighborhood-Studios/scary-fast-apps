UPDATE_TRIGGERS_SQL = '''
DO
$$
    BEGIN
        CREATE FUNCTION public.update_timestamps_func(
        )
            RETURNS trigger AS
        $BODY$
        BEGIN
            IF TG_OP = 'INSERT'
            THEN
                IF NEW.created_at IS NULL
                THEN
                    NEW.created_at = current_timestamp;
                END IF;
            ELSE
                IF OLD.updated_at IS NOT DISTINCT FROM NEW.updated_at
                THEN
                    NEW.updated_at = current_timestamp;
                END IF;
            END IF;
            RETURN NEW;
        END;
        $BODY$
            LANGUAGE plpgsql
            VOLATILE;

    EXCEPTION
        WHEN DUPLICATE_FUNCTION THEN
            NULL;
    END;
$$;


-- generic update function that can be re-run to add triggers to all public tables
DO LANGUAGE plpgsql
$$
    DECLARE
        rec record;
    BEGIN
        FOR rec IN
            SELECT
                c.table_schema AS schema,
                c.table_name,
                tgs.trigger_name
            FROM information_schema.columns c
                 LEFT JOIN information_schema.triggers tgs
                           ON
                                       tgs.trigger_schema = c.table_schema
                                   AND tgs.event_object_table = c.table_name
                                   AND tgs.trigger_name = c.table_name || '_timestamps_trig'
            WHERE c.column_name = 'created_at'
              AND c.table_schema = 'public'
              AND tgs.trigger_name IS NULL
        LOOP
            -- internal tables that should be excluded
            IF rec.table_name IN ('django_dramatiq_task')
            THEN
                CONTINUE;
            END IF;

            -- set default value
            EXECUTE format(
                    'ALTER TABLE %I.%I ALTER created_at SET DEFAULT CURRENT_TIMESTAMP',
                    rec.schema,
                    rec.table_name
                );

            EXECUTE format(
                    'CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON %I.%I FOR EACH ROW EXECUTE PROCEDURE public.update_timestamps_func()',
                    rec.table_name || '_timestamps_trig',
                    rec.schema, rec.table_name, rec.table_name);
        END loop;
    END ;
$$;

'''
