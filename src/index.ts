import '#libs/utils/setup'
import { KenzoClient } from "#libs/structures/KenzoClient";

async function main() {
    try{
        await new KenzoClient()
            .login();
    }
    catch(error){
        console.log(error);
    }
}

main();