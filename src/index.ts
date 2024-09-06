import { getInput, setFailed } from "@actions/core";
import { context, getOctokit } from "@actions/github";

export async function run() {
    const token = getInput("gh-token");
    const notificationSummary = getInput("notification-summary");
    const msTeamsWebhookUri = getInput("msTeams-webhook-uri");
    const notificationColour = getInput("notification-colour");
    const notificationType = getInput("notification-type");
    const octoKit = getOctokit(token);

    try{  
        
        let committerName;
        let commitHtmlUrl;
        let avatarUrl;
        let actorUrl;
        let actorName;
        let dateTime = new Date();
        const shortSha:string = context.sha.substring(0,7);
        const repoId = (await octoKit.rest.repos.get({
            owner: context.repo.owner,
            repo: context.repo.repo,
            headers: {
            'X-GitHub-Api-Version': '2022-11-28'
                }
            })).data.id;
        
        
        const commitDetails = await octoKit.rest.git.getCommit({
                owner: context.repo.owner,
                repo: context.repo.repo,
                commit_sha: context.sha,
                headers: {
                    'X-GitHub-Api-Version': '2022-11-28'
                    }
        });
        
        if(commitDetails.data.author.email != "invalid-email-address")
        {
            const committerName:string = commitDetails.data.author.name;
            const commitHtmlUrl:string = commitDetails.data.html_url;
        }
        else{
            const committerName:string = commitDetails.data.committer.name;
            const commitHtmlUrl:string = commitDetails.data.html_url;
        }  

        if(context.actor.match("github-actions"))
        {
            const appData = (await octoKit.rest.apps.getBySlug({
                app_slug: "github-actions",
                headers: {
                    'X-GitHub-Api-Version': '2022-11-28'
                    }
            })).data;
            
            const avatarUrl =  appData.owner?.avatar_url;
            const actorUrl = appData.html_url;
            const actorName = appData.name;
        }
        else{
            const userData = (await octoKit.rest.users.getByUsername({
                username: context.actor,
                headers: {
                    'X-GitHub-Api-Version': '2022-11-28'
                    }
            })).data;

            const avatarUrl =  userData.avatar_url;
            const actorUrl = userData.html_url;
            const actorName = userData.name;
        }

        const deployedBy = `[${actorName}](${actorUrl})`
        const activitySubtitle = `commited by ${committerName}`
        const activityTitle = `CI #${context.runNumber} (commit ${shortSha}) on [${context.repo.owner}/${context.repo.repo}](https://github.com/${context.repo.owner}/${context.repo.repo})`
    
        const newbody = { 
          "type": "message",
          "attachments": [
          {
            "contentType": "application/vnd.microsoft.card.adaptive",
            "content": {
              "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
              "type": "AdaptiveCard",
              "version": "1.0",
              "msteams": {
                "width": "Full"
              },
              "body": [
                {
                  "type": "Container",
                  "style": notificationColour,
                  "items": [
                  {
                    "type": "TextBlock",
                    "text": notificationSummary,
                    "weight": "bolder",
                    "size": "Large"
                  },
                  {
                    "type": "ColumnSet",
                    "columns": [
                    {
                      "type": "Column",
                      "width": "auto",
                      "items": [
                      {
                        "type": "Image",
                        "url": avatarUrl,
                        "altText": deployedBy,
                        "size": "small",
                        "style": "person"
                      }
                      ]
                    },
                    {
                      "type": "Column",
                      "width": "stretch",
                      "items": [
                      {
                        "type": "TextBlock",
                        "text": deployedBy,
                        "weight": "bolder",
                        "wrap": true
                      },
                      {
                        "type": "TextBlock",
                        "spacing": "none",
                        "text": `Created ${dateTime}`,
                        "isSubtle": true,
                        "wrap": true
                      }
                      ]
                    }
                    ]
                  }
                  ]
                },
                {
                  "type": "Container",
                  "style": "emphasis",
                  "items": [
                  {
                    "type": "TextBlock",
                    "text": activityTitle,
                    "weight": "bolder",
                    "wrap": true
                  },
                  {
                    "type": "TextBlock",
                    "text": activitySubtitle,
                    "wrap": true
                  },
                  {
                    "type": "FactSet",
                    "facts": [
                    {
                      "title": "Deployed by:",
                      "value": deployedBy
                    },
                    {
                       "title": "Deployed on:",
                      "value": dateTime
                    },
                    {
                      "title": "Branch:",
                      "value": context.ref
                    }
                    ]
                  }
                  ]
                }
                ],
                "actions": [
                {
                  "type": "Action.OpenUrl",
                  "title": "View Workflow Run",
                  "url": `https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`
                },
                {
                  "type": "Action.OpenUrl",
                  "title": "View Commit Changes",
                  "url": commitHtmlUrl
                }
                ]
              }
            }
          ]
        }
        
        const headers: Headers = new Headers()
        // Add a few headers
        headers.set('Content-Type', 'application/json')
        headers.set('Accept', 'application/json')
        const request: RequestInfo = new Request(msTeamsWebhookUri, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(newbody)
          })
        
        console.log(request)

    }   catch(error){
        setFailed((error as Error)?.message ?? "Unknown error");
    }
    
}

if(!process.env.JEST_WORKER_ID){
    run();
}