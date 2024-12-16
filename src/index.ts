import { getInput, setFailed } from "@actions/core";
import { context, getOctokit } from "@actions/github";

export async function run() {
    const token = getInput("gh-token");
    const notificationSummary = getInput("notification-summary");
    const msTeamsWebhookUri = getInput("msTeams-webhook-uri");
    const notificationColour = getInput("notification-colour");
    const notificationType = getInput("notification-type");
    const octoKit = getOctokit(token);

    try {
        let committerName;
        let commitHtmlUrl;
        let avatarUrl;
        let actorUrl;
        let actorName;
        let dateTime = new Date();
        const shortSha = context.sha.substring(0, 7);

        // Fetch repository ID
        const repoId = (await octoKit.rest.repos.get({
            owner: context.repo.owner,
            repo: context.repo.repo,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        })).data.id;

        // Fetch commit details
        const commitDetails = await octoKit.rest.git.getCommit({
            owner: context.repo.owner,
            repo: context.repo.repo,
            commit_sha: context.sha,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });

        if (commitDetails.data.author.email !== "invalid-email-address") {
            committerName = commitDetails.data.author.name;
            commitHtmlUrl = commitDetails.data.html_url;
        } else {
            committerName = commitDetails.data.committer.name;
            commitHtmlUrl = commitDetails.data.html_url;
        }

        // Fetch actor details
        if (context.actor.match("github-actions")) {
            const appData = (await octoKit.rest.apps.getBySlug({
                app_slug: "github-actions",
                headers: {
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            })).data;

            avatarUrl = appData.owner?.avatar_url;
            actorUrl = appData.html_url;
            actorName = appData.name;
        } else {
            const userData = (await octoKit.rest.users.getByUsername({
                username: context.actor,
                headers: {
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            })).data;

            avatarUrl = userData.avatar_url;
            actorUrl = userData.html_url;
            actorName = userData.name;
        }

        const deployedBy = `[${actorName}](${actorUrl})`;
        const activitySubtitle = `committed by ${committerName}`;
        const activityTitle = `CI #${context.runNumber} (commit ${shortSha}) on [${context.repo.owner}/${context.repo.repo}](https://github.com/${context.repo.owner}/${context.repo.repo})`;

        const deploymentBody = {
         "title": "GitHub Actions Notification",
         "text": "A new push to the **main** branch has been made.",
         "attachments": [
          {
           "contentType": "application/vnd.microsoft.card.adaptive",
           "content": {
           "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
           "type": "AdaptiveCard",
           "version": "1.2",
           "body": [
           {
            "type": "TextBlock",
            "text": "GitHub Actions Notification",
            "weight": "Bolder",
            "size": "Medium"
          },
          {
            "type": "TextBlock",
            "text": "A new push to the **main** branch has been made.",
            "wrap": true
           }
         ]
         }
         }
         ]
};

        let body;
        if (notificationType === "deployment") {
            body = deploymentBody;
        } else {
            body = { "message": "Fallback body for other notification types" };
        }

        // Construct and send the fetch request
        const response = await fetch(msTeamsWebhookUri, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body)
        });

        // Log request and response for debugging
        console.log("Request Payload:", JSON.stringify(body, null, 2));
        if (!response.ok) {
            const errorDetails = await response.text();
            console.error(`Request failed: ${response.status} ${response.statusText}`, errorDetails);
            throw new Error(`Failed to send request.`);
        }

        console.log(`Notification sent successfully. HTTP Status: ${response.status}`);
    } catch (error) {
        console.error("Error sending notification:", error);
        setFailed(error.message);
    }
}

if (!process.env.JEST_WORKER_ID) {
    run();
}
