function run(argv) {
  const QUERY = argv[0];

  const app = Application.currentApplication();
  app.includeStandardAdditions = true;

  // api vars and secrets
  const CLOCKIFY_BASE_URL = 'https://api.clockify.me/api/v1';
  const CLOCKIFY_API_KEY = app.systemAttribute('clockify_api_key');
  const CLOCKIFY_WORKSPACE_ID = app.systemAttribute('clockify_workspace_id');
  const CLOCKIFY_USER_ID = app.systemAttribute('clockify_user_id');

  // cache setup
  const CACHE_DIR = app.systemAttribute('alfred_workflow_cache');
  const CACHE_EXTEN = 'alfredcache';

  const Util = {
    shellEncode: (data) => {
      if (typeof data === 'object') data = JSON.stringify(data);
      return [...data].map((char) => char.charCodeAt(0)).join(' ');
    },

    shellDecode: (data) => {
      data = String.fromCharCode(...data.split(/\s/g));
      try {
        data = JSON.parse(data);
      } catch (ex) {}
      return data;
    },

    readCache: (key) => {
      try {
        const data = app.doShellScript(`\
            curl --location \
            --request GET 'file://${CACHE_DIR}/${key}.${CACHE_EXTEN}'`);
        return Util.shellDecode(data);
      } catch (ex) {
        return '';
      }
    },
    writeCache: (key, value) => {
      app.doShellScript(
        `mkdir -p "${CACHE_DIR}"; \
          printf "${Util.shellEncode(
            value,
          )}" > "${CACHE_DIR}/${key}.${CACHE_EXTEN}";`,
      );
      return value;
    },
  };

  const Clockify = () => {
    const getUser = () => {
      const res =
        app.doShellScript(`curl --location --request GET '${CLOCKIFY_BASE_URL}/user' \
      --header 'Cache-Control: no-cache' \
      --header 'Accept: application/json' \
      --header 'X-Api-Key: ${CLOCKIFY_API_KEY}'`);

      return JSON.parse(res);
    };

    const getWorkspaces = (refresh = false) => {
      let res = Util.readCache('workspaces');

      if (refresh || !res) {
        res =
          app.doShellScript(`curl --location --request GET '${CLOCKIFY_BASE_URL}/workspaces' \
      --header 'Cache-Control: no-cache' \
      --header 'Accept: application/json' \
      --header 'X-Api-Key: ${CLOCKIFY_API_KEY}'`);
        Util.writeCache('workspaces', res);
      }

      return JSON.parse(res);
    };

    const getEntries = () => {
      const res =
        app.doShellScript(`curl --location --request GET '${CLOCKIFY_BASE_URL}/workspaces/${CLOCKIFY_WORKSPACE_ID}/user/${CLOCKIFY_USER_ID}/time-entries' \
    --header 'Cache-Control: no-cache' \
    --header 'Accept: application/json' \
    --header 'X-Api-Key: ${CLOCKIFY_API_KEY}'`);

      return JSON.parse(res);
    };

    const startTimer = () => {
      const res =
        app.doShellScript(`curl --location --request POST '${CLOCKIFY_BASE_URL}/workspaces/${CLOCKIFY_WORKSPACE_ID}/time-entries' \
    --header 'Cache-Control: no-cache' \
    --header 'Accept: application/json' \
    --header 'X-Api-Key: ${CLOCKIFY_API_KEY}' \
    --header 'Content-Type: application/json' \
    --data-raw '{
        "start": "${new Date().toISOString()}"
    }'`);

      return JSON.parse(res);
    };

    const stopTimer = (projectId = null, description = null) => {
      // get ongoing entry
      const ongoing = getEntries()[0];

      // timer already stopped
      if (!!ongoing.timeInterval.end) return {};

      // update entry details before stopping -- cannot do in one request
      let res =
        app.doShellScript(`curl --location --request PUT '${CLOCKIFY_BASE_URL}/workspaces/${CLOCKIFY_WORKSPACE_ID}/time-entries/${
          ongoing.id
        }' \
    --header 'Cache-Control: no-cache' \
    --header 'Accept: application/json' \
    --header 'X-Api-Key: ${CLOCKIFY_API_KEY}' \
    --header 'Content-Type: application/json' \
    --data-raw '{
        "start": "${ongoing.timeInterval.start}",
        "projectId": ${projectId ? `"${projectId}"` : 'null'},
        "description":  ${
          description ? `"${description.replace("'", "\\'")}"` : 'null'
        }
    }'`);

      // end timer/entry
      res =
        app.doShellScript(`curl --location --request PATCH '${CLOCKIFY_BASE_URL}/workspaces/${CLOCKIFY_WORKSPACE_ID}/user/${CLOCKIFY_USER_ID}/time-entries' \
    --header 'Cache-Control: no-cache' \
    --header 'Accept: application/json' \
    --header 'X-Api-Key: ${CLOCKIFY_API_KEY}' \
    --header 'Content-Type: application/json' \
    --data-raw '{
        "end": "${new Date().toISOString()}"
    }'`);
      return JSON.parse(res);
    };

    const discardTimer = () => {
      const ongoing = getEntries()[0];

      if (!!ongoing.timeInterval.end) return false;

      app.doShellScript(`curl --location --request DELETE '${CLOCKIFY_BASE_URL}/workspaces/${CLOCKIFY_WORKSPACE_ID}/time-entries/${ongoing.id}' \
      --header 'Cache-Control: no-cache' \
      --header 'Accept: application/json' \
      --header 'X-Api-Key: ${CLOCKIFY_API_KEY}' \
      --header 'Content-Type: application/json'`);

      return true;
    };

    const getClients = (refresh = false) => {
      let res = Util.readCache('clients');

      if (refresh || !res) {
        res =
          app.doShellScript(`curl --location --request GET '${CLOCKIFY_BASE_URL}/workspaces/${CLOCKIFY_WORKSPACE_ID}/clients' \
    --header 'Cache-Control: no-cache' \
    --header 'Accept: application/json' \
    --header 'X-Api-Key: ${CLOCKIFY_API_KEY}'`);

        Util.writeCache('clients', res);
      }

      return typeof res === 'object' ? res : JSON.parse(res);
    };

    const getClientProjects = (clientId, refresh = false) => {
      const cacheKey = `projects-${clientId}`;
      let res = Util.readCache(cacheKey);

      if (refresh || !res) {
        res =
          app.doShellScript(`curl --location --request GET '${CLOCKIFY_BASE_URL}/workspaces/${CLOCKIFY_WORKSPACE_ID}/projects?clients=${clientId}' \
        --header 'Cache-Control: no-cache' \
        --header 'Accept: application/json' \
        --header 'X-Api-Key: ${CLOCKIFY_API_KEY}'`);

        Util.writeCache(cacheKey, res);
      }

      return typeof res === 'object' ? res : JSON.parse(res);
    };

    return {
      getUser,
      getWorkspaces,
      getEntries,
      startTimer,
      stopTimer,
      discardTimer,
      getClients,
      getClientProjects,
    };
  };

  const Alfred = {
    setEnv: (key, value) => {
      const prefs = Alfred.var('preferences');
      const workflowUid = Alfred.var('workflow_uid');
      const workflowDir = `${prefs}/workflows/${workflowUid}`;

      return Application('System Events')
        .propertyListFiles.byName(`${workflowDir}/info.plist`)
        .propertyListItems.byName('variables')
        .propertyListItems.byName(key)
        .value.set(value);
    },

    error: (message) =>
      app.displayNotification(message, {
        soundName: 'Pop',
        withTitle: 'Clockify',
      }),

    info: (message) =>
      app.displayNotification(message, {
        soundName: 'Hero',
        withTitle: 'Clockify',
      }),

    invoke: (trigger, arg = '') => {
      Application('Alfred').runTrigger(trigger, {
        inWorkflow: Alfred.var('workflow_bundleid'),
        withArgument: typeof arg === 'string' ? arg : JSON.stringify(arg),
      });
    },

    dismiss: () => Alfred.invoke('dismiss'),

    var: (name) => app.systemAttribute(`alfred_${name}`) || '',

    getActivity: () => {
      return Alfred.var('activity');
    },

    /**
     * Use the current query to search through items using a fuzzy algorithm.
     * @param {Array} items The items to be searched/filtered.
     * @param {string} QUERY The ongoing query.
     * @param {string|Array<string>} keys For Array<Object> in `items`, the object query when searching.
     * @returns Array
     */
    fuzzySearch: (items, keys = []) =>
      items.filter((item) =>
        QUERY.split(/\s/g).every(
          (word) =>
            !!(
              typeof item === 'object'
                ? [keys]
                    .flat()
                    .map((key) => item[key])
                    .join(' ')
                : item
            ).match(new RegExp(`${word}`, 'gi')),
        ),
      ),

    /**
     * Make an array of objects for Alfred's filter mechanism.
     * @param {Array} arr The array of items to use.
     * @param {string} varNameToSet The variable to persist on commit.
     * @param {string} nextActivity The next activity to run on commit.
     * @param {string} titleKey For Array<Object>, the key to use for `title`.
     * @param {string} valueKey For Array<Object>, the key to use for variable values.
     * @param {string} subtitleKey For Array<Object>, the key to use for `subtitle`.
     * @returns Array
     */
    makeFilterItems: (
      arr,
      varNameToSet,
      nextActivity,
      titleKey = '',
      valueKey = '',
      subtitleKey = null,
    ) => {
      if (!arr.length) return [];

      const make = (what) =>
        typeof arr[0] === 'object'
          ? (item) => item[eval(`${what}Key;`)]
          : (item) => item;

      return arr.map((item) =>
        Object.assign(
          {
            title: make('title')(item),
            variables: {
              [`alfred_${varNameToSet}`]: make('value')(item),
              alfred_activity: nextActivity,
            },
          },
          subtitleKey ? { subtitle: make('subtitle')(item) } : {},
        ),
      );
    },

    /**
     * Create an instructions/prompt list item.
     * @param {string} title The instruction title.
     * @param {string} subtitle The instruction subtitle
     * @returns Object
     */
    makeInstructions: (title, subtitle = '') => ({
      title,
      subtitle,
      valid: false,
    }),

    /**
     * Prompt the user for text input.
     * @param {*} QUERY The ongoing query object.
     * @param {*} varNameToSet The variable to persist.
     * @param {*} nextActivity The next activity to run on commit.
     * @param {*} title The prompt title.
     * @param {*} subtitle The prompt subtitle.
     * @returns Object
     */
    makeTextPrompt: (varNameToSet, nextActivity, title, subtitle = '') =>
      Object.assign(Alfred.makeInstructions(title, subtitle), {
        match: QUERY,
        variables: {
          [`alfred_${varNameToSet}`]: QUERY,
          alfred_activity: nextActivity,
        },
        valid: !!QUERY,
      }),
  };

  const Activities = {
    install_user_id: () => {
      const user = Clockify().getUser();
      if ('id' in user)
        Alfred.info(
          'Clockify user environment variable has been set successfully.',
        );
      else return Alfred.error('Could not retrieve user using current API key');

      // clear workspaces cache
      Util.writeCache('workspaces', '');

      Alfred.setEnv('clockify_user_id', user.id);

      Alfred.dismiss();
    },

    install_workspace_id: () => {
      const workspaces = Clockify().getWorkspaces();

      let items = Alfred.fuzzySearch(workspaces, 'name');
      items = [
        Alfred.makeInstructions(
          'Select Workspace',
          'Choose the workspace to use with alfred-clockify.',
        ),
        ...Alfred.makeFilterItems(
          items,
          'workspace_id',
          'define_workspace_id',
          'name',
          'id',
        ),
      ];

      return { items };
    },

    define_workspace_id: () => {
      Alfred.setEnv('clockify_workspace_id', Alfred.var('workspace_id'));
      Alfred.info(
        'Clockify workspace environment variable has been set successfully.',
      );
      Alfred.dismiss();
    },

    create_time_entry: () => {
      Alfred.dismiss();

      const start = Clockify().startTimer();

      if ('id' in start) Alfred.info('New Clockify timer started.');
      else Alfred.error('New Clockify timer failed to start.');
    },

    pick_client: () => {
      let clients = Clockify().getClients();

      let items = Alfred.fuzzySearch(clients, 'name');
      items = [
        Alfred.makeInstructions(
          'Assign Client',
          'Choose the client to which the time entry belongs.',
        ),
        ...Alfred.makeFilterItems(
          items,
          'client_id',
          'pick_project',
          'name',
          'id',
        ),
      ];

      return { items };
    },

    pick_project: () => {
      let projects = Clockify().getClientProjects(Alfred.var('client_id'));

      let items = Alfred.fuzzySearch(projects, 'name');
      items = [
        Alfred.makeInstructions(
          'Assign Project',
          'Choose the project to which the time entry belongs.',
        ),
        ...Alfred.makeFilterItems(
          items,
          'project_id',
          'set_time_entry_description',
          'name',
          'id',
        ),
      ];

      return { items };
    },

    set_time_entry_description: () => {
      let items = [
        Alfred.makeTextPrompt(
          'time_entry_description',
          'end_ongoing_timer',
          'Assign Description',
          'Enter the description of the time entry.',
        ),
      ];

      return { items };
    },

    end_ongoing_timer: () => {
      Alfred.dismiss();

      const stop = Clockify().stopTimer(
        Alfred.var('project_id'),
        Alfred.var('time_entry_description'),
      );

      if ('id' in stop) Alfred.info('Ongoing Clockify timer ended.');
      else Alfred.error('Ongoing Clockify timer failed to end.');
    },

    discard_timer: () => {
      Alfred.dismiss();

      const discard = Clockify().discardTimer();
      if (!discard)
        return Alfred.error('No ongoing Clockify timer available for discard.');
      Alfred.info('Ongoing Clockify timer has been deleted.');
    },
  };

  return JSON.stringify(Activities[Alfred.getActivity()]());
}
