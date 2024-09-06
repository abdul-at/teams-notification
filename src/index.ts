import { getInput, setFailed } from "@actions/core";
import { context, getOctokit } from "@actions/github";

export async function run() {
    const token = getInput("gh-token");
    const octoKit = getOctokit(token);

    try{  
        
        interface variable {
            name: string;
            value: string;
          }
        let variables: variable[] = []

        const repoId = (await octoKit.rest.repos.get({
            owner: context.repo.owner,
            repo: context.repo.repo,
            headers: {
            'X-GitHub-Api-Version': '2022-11-28'
                }
            })).data.id
        
        
        const commitDetails = await octoKit.rest.git.getCommit({
                owner: context.repo.owner,
                repo: context.repo.repo,
                commit_sha: context.sha,
                headers: {
                    'X-GitHub-Api-Version': '2022-11-28'
                    }
        });

        console.log(commitDetails.data.author.email);
        
        if(commitDetails.data.author.email != "invalid-email-address")
        {
            const committerID:string = commitDetails.data.author.name
            const committerName:string = commitDetails.data.author.name
            const commitHtmlUrl:string = commitDetails.data.html_url
            const committerUrl = (await octoKit.rest.users.getByUsername({
                username: commitDetails.data.author.name,
                headers: {
                    'X-GitHub-Api-Version': '2022-11-28'
                    }
                })).data.html_url
                console.log(committerID);
                console.log(committerName);
                console.log(commitHtmlUrl);
                console.log(committerUrl);
        }

        

    }   catch(error){
        setFailed((error as Error)?.message ?? "Unknown error");
    }
    
}

if(!process.env.JEST_WORKER_ID){
    run();
}