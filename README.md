# Installation
1. `npm install`

# Usage
1. `npm start`;
2. `have some sort of cron job hit /cron every 5 minutes (per default)`;
    - this should match your env `SCHEDULER_MAX` and `SCHEDULER_MAX_UNIT` settings

## API

### `POST` `/schedule`
Schedules a request to be made to the callback (url) of your choosing with the data of your choosing

###### Params
Name                  | Description
----------------------|------------------------------------
startTimestamp        | ISO date string,
payload               | String (optional)
name                  | String (optional)
callback              | URL
callbackContentType   | Method type
callbackMethod        | request method (GET, POST, etc.)
##### Response
```
{
    taskId: String, 
    waitDuration: Number, 
    startTimestamp: String
}
```

### `DELETE` `/schedule/:taskId`, `GET` `/schedule/:taskId/stop`
Removes a previously scheduled task

##### Response
```
{
    taskId: String, state: String, // cancelled or done (if task already executed)
}

// or if task was already removed
true

// NOTE UNSTABLE the response of repeat calls is TBD
```

### `GET` `/schedule/list`
returns json array of tasks being scheduled

##### Response
```
{   
    count: Number
    tasks: [
        {
            taskNumId: Number,
            taskId: String,
            state: String,
            startTimestamp: String,
            payload: String,
            name: String,
            callback: String,
            callbackContentType: String,
            callbackMethod: String,
        },
        ...
    ]
}
```

# Development

### Todo
- [ ] handle data cleanup over long periods of time. (tasks should probably be purged entirely from memory cache after a few days post completion)
- [ ] move server with cron job to docker image for portability and easy setup
