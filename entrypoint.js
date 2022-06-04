function run(_) {
  const app = Application.currentApplication();
  app.includeStandardAdditions = true;

  const env = (key) => app.systemAttribute(`${key}`) || '';

  const makeActivityItem = (title, subtitle, arg, valid = true) => ({
    title,
    subtitle,
    arg,
    valid
  });

  const items = (items) => JSON.stringify({ items });

  const DEFAULT_ITEMS = [
    makeActivityItem(
      'Start',
      'Start a new Clockify time entry.',
      'create_time_entry'
    ),
    makeActivityItem(
      'Stop',
      'End the currently-ongoing clockify time entry.',
      'pick_client'
    ),
    makeActivityItem(
      'Discard',
      'Discard the currently-ongoing clockify time entry.',
      'discard_timer'
    )
  ];

  const SETUP_API_KEY_ITEMS = [
    makeActivityItem(
      'Set API Key to Continue',
      'Define the Clockify API key environment variable to continue.',
      'install_api_key',
      false
    )
  ];

  const SETUP_USER_ID_ITEMS = [
    makeActivityItem(
      'Setup User Account',
      'Select this option to install your Clockify user id.',
      'install_user_id'
    )
  ];

  const SETUP_WORKSPACE_ID_ITEMS = [
    makeActivityItem(
      'Choose Workspace',
      'Select this option to define the Clockify workspace ID to use',
      'install_workspace_id'
    )
  ];

  if (!env('clockify_api_key')) return items(SETUP_API_KEY_ITEMS);
  if (!env('clockify_user_id')) return items(SETUP_USER_ID_ITEMS);
  if (!env('clockify_workspace_id')) return items(SETUP_WORKSPACE_ID_ITEMS);

  return items(DEFAULT_ITEMS);
}
