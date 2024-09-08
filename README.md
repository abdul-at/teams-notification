# Replace token

Simple GitHub Action to send teams notification to channel using cloudflow template 'Post to a channel when a webhook request is received'  

please follow below link for more details around creation of [incoming webhook for teams channel](https://support.microsoft.com/en-gb/office/create-incoming-webhooks-with-workflows-for-microsoft-teams-8ae491c7-0394-4861-ba59-055e33f75498)

Please note that variable substitution is case sensitive, please try to store tokens in uppercase in Tokenized files.

## Inputs

- `gh-token` - Github Token or Pat Token (Required)
- `notification-summary` - Summary of Notification eg. 'Deployment started on Dev environment v10.2.6' (Required)
- `msTeams-webhook-uri` - webhook uri of teams channel (Required)
- `notification-colour` - Notification colour, good for successful, attention for failure, accent for information `#{` (Required)
- `notification-type` - deployment or information notification (Required)

## Example
```yml

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: 'Checkout Github Action' 
      uses: actions/checkout@4

    - uses: vinayaja/teams-notification@v1.0.0
      with:
        gh-token: ${{ github.token }}
        notification-summary: "Deployment test"
        msTeams-webhook-uri: ${{ secrets.TEAMS_WEBHOOK }}
        notification-colour: 'good'
        notification-type: 'deployment'
```