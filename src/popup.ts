import appVersion from "./manifest/version"

window.addEventListener("DOMContentLoaded", () => {
    const p = document.getElementById("version")
    if(p !== null){
        p.innerText = `v${appVersion}`
    }
})