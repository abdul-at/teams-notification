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
        // Fetch commit details
        const shortSha: string = context.sha.substring(0, 7);
        const commitDetails = await octoKit.rest.git.getCommit({
            owner: context.repo.owner,
            repo: context.repo.repo,
            commit_sha: context.sha,
            headers: {
                "X-GitHub-Api-Version": "2022-11-28",
            },
        });

        const committerName =
            commitDetails.data.author.email !== "invalid-email-address"
                ? commitDetails.data.author.name
                : commitDetails.data.committer.name;
        const commitHtmlUrl = commitDetails.data.html_url;

        // Fetch actor details
        let avatarUrl: string;
        let actorUrl: string;
        let actorName: string;

        if (context.actor.match("github-actions")) {
            const appData = await octoKit.rest.apps.getBySlug({
                app_slug: "github-actions",
                headers: {
                    "X-GitHub-Api-Version": "2022-11-28",
                },
            });
            avatarUrl = appData.data.owner?.avatar_url || "";
            actorUrl = appData.data.html_url;
            actorName = appData.data.name || "GitHub Actions";
        } else {
            const userData = await octoKit.rest.users.getByUsername({
                username: context.actor,
                headers: {
                    "X-GitHub-Api-Version": "2022-11-28",
                },
            });
            avatarUrl = userData.data.avatar_url;
            actorUrl = userData.data.html_url;
            actorName = userData.data.name || context.actor;
        }

        // Common variables for notification
        const deployedBy = `[${actorName}](${actorUrl})`;
        const dateTime = new Date().toISOString();
        const activityTitle = `CI #${context.runNumber} (commit ${shortSha}) on [${context.repo.owner}/${context.repo.repo}](https://github.com/${context.repo.owner}/${context.repo.repo})`;
        const activitySubtitle = `Committed by ${committerName}`;

        // Define adaptive card bodies
        const deploymentBody = {
            type: "message",
            attachments: [
                {
                    contentType: "application/vnd.microsoft.card.adaptive",
                    content: {
                        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
                        type: "AdaptiveCard",
                        version: "1.0",
                        msteams: { width: "Full" },
                        body: [
                            {
                                type: "Container",
                                style: notificationColour,
                                items: [
                                    {
                                        type: "TextBlock",
                                        text: notificationSummary,
                                        weight: "bolder",
                                        size: "Large",
                                    },
                                    {
                                        type: "ColumnSet",
                                        columns: [
                                            {
                                                type: "Column",
                                                width: "auto",
                                                items: [
                                                    {
                                                        type: "Image",
                                                        url: avatarUrl,
                                                        altText: deployedBy,
                                                        size: "small",
                                                        style: "person",
                                                    },
                                                ],
                                            },
                                            {
                                                type: "Column",
                                                width: "stretch",
                                                items: [
                                                    {
                                                        type: "TextBlock",
                                                        text: deployedBy,
                                                        weight: "bolder",
                                                        wrap: true,
                                                    },
                                                    {
                                                        type: "TextBlock",
                                                        spacing: "none",
                                                        text: `Created ${dateTime}`,
                                                        isSubtle: true,
                                                        wrap: true,
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                            {
                                type: "Container",
                                style: "emphasis",
                                items: [
                                    {
                                        type: "TextBlock",
                                        text: activityTitle,
                                        weight: "bolder",
                                        wrap: true,
                                    },
                                    {
                                        type: "TextBlock",
                                        text: activitySubtitle,
                                        wrap: true,
                                    },
                                    {
                                        type: "FactSet",
                                        facts: [
                                            { title: "Deployed by:", value: deployedBy },
                                            { title: "Deployed on:", value: dateTime },
                                            { title: "Branch:", value: context.ref },
                                        ],
                                    },
                                ],
                            },
                        ],
                        actions: [
                            {
                                type: "Action.OpenUrl",
                                title: "View Workflow Run",
                                url: `https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`,
                            },
                            {
                                type: "Action.OpenUrl",
                                title: "View Commit Changes",
                                url: commitHtmlUrl,
                            },
                        ],
                    },
                },
            ],
        };

        const informationBody = {
            type: "message",
            attachments: [
                {
                    contentType: "application/vnd.microsoft.card.adaptive",
                    content: {
                        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
                        type: "AdaptiveCard",
                        version: "1.0",
                        body: [
                            {
                                type: "Container",
                                items: [
                                    {
                                        type: "TextBlock",
                                        text: notificationSummary,
                                        weight: "bolder",
                                        size: "Large",
                                    },
                                ],
                            },
                        ],
                    },
                },
            ],
        };

        // Select body based on notificationType
        const body =
            notificationType === "deployment"
                ? deploymentBody
                : notificationType === "information"
                ? informationBody
                : null;

        if (!body) {
            throw new Error(
                `Invalid notification type '${notificationType}'. Expected 'deployment' or 'information'.`
            );
        }

        // Send notification
        const response = await fetch(msTeamsWebhookUri, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(
                `Failed to send notification. HTTP Status: ${response.status} - ${response.statusText}`
            );
        }

        console.log(`Notification sent successfully. HTTP Status: ${response.status}`);
    } catch (error) {
        setFailed((error as Error)?.message ?? "Unknown error");
    }
}

if (!process.env.JEST_WORKER_ID) {
    run();
}
