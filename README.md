# alfred-clockify

Quickly start and stop your Clockify timers from Alfred.

## Installation

After installing the workflow, you will be prompted to define its environment variables. To get started, only the Clockify API key is required — the workflow can resolve your user id and any available workspaces once the API key is configured.

After configuring the API key, run the workflow using the `.clockify` keyword. If your user id has not been defined, you will be prompted to install it. Select the _Setup User Account_ option to automatically resolve the user id from the provided API key.

Once both the API key and user id have been configured, if you have not already configured a workspace id, you will be prompted to select a workspace. Select the _Choose Workspace_ option to pick your workspace from a list.

## Workflow Variables

|        Variable         | Description                                                     |
| :---------------------: | :-------------------------------------------------------------- |
|   `clockify_api_key`    | Your Clockify API key.                                          |
|   `clockify_user_id`    | Your Clockify user id.                                          |
| `clockify_workspace_id` | The workspace id to use when creating and editing time entries. |

## Workflow Design

`alfred-clockify` is my first complex Alfred workflow. It uses JXA at its core, and leverages script-driven recursion via a single _Script Filter_ node rather than using multiple workflow nodes to perform operations. Ultimately, I think this yields a more maintainable and less redundant workflow — engaging functional workflow design.
If you have any questions about this workflow or the techniques engaged, please feel free to reach-out via [e-mail](mailto:stephancasas@icloud.com) or on [Twitter](https://www.twitter.com/stephancasas)

## License

MIT — _Hell yeah, free software!_
