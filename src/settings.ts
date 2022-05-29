window.addEventListener("DOMContentLoaded", async () => {
    const accessTokenInput = document.getElementById("accessToken")
    if(accessTokenInput !== null && accessTokenInput instanceof HTMLInputElement) {
        const accessToken = await browser.storage.sync.get(["accessToken"]).then((result) => {
            return result.accessToken?.toString()
        })
        if(accessToken && typeof accessToken === "string") {
            accessTokenInput.value = accessToken
        }
        accessTokenInput.addEventListener("change", async (event) => {
            if (!(event.currentTarget instanceof HTMLInputElement)) {
                return;
            }
            await browser.storage.sync.set({"accessToken": event.currentTarget.value});
        })
    }
})

document.querySelector("form")?.addEventListener("submit", (event: SubmitEvent) => {
    event.preventDefault();
    const accessTokenInput = document.getElementById("accessToken")
    if(accessTokenInput !== null && accessTokenInput instanceof HTMLInputElement) {
        browser.storage.sync.set({"accessToken": accessTokenInput.value});
    }
})
