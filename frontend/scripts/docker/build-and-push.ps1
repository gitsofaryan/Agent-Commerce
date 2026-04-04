param(
    [Parameter(Mandatory = $true)]
    [string]$DockerHubUser,
    [string]$ImageName = "agent-commerce",
    [string]$Tag = "latest"
)

$ErrorActionPreference = "Stop"

$fullImage = "$DockerHubUser/$ImageName`:$Tag"
$localImage = "$ImageName`:$Tag"

Write-Host "Building image: $localImage"
docker build -t $localImage .

Write-Host "Tagging image: $fullImage"
docker tag $localImage $fullImage

Write-Host "Pushing image: $fullImage"
docker push $fullImage

Write-Host "Done: $fullImage"
