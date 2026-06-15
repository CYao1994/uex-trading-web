$TOKEN = "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"
$REPO = "CYao1994/uex-trading-web"
$HEADERS = @{
    "Authorization" = "token $TOKEN"
    "Accept" = "application/vnd.github.v3+json"
}
$baseDir = "C:\Users\GUNDA\uex-trading-web-main"

# 获取最新提交
$ref = Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/git/refs/heads/main" -Headers $HEADERS
$latestCommitSha = $ref.object.sha
$commit = Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/git/commits/$latestCommitSha" -Headers $HEADERS
$baseTreeSha = $commit.tree.sha
Write-Host "Base tree: $baseTreeSha"

$treeItems = @()

# 处理文件
$files = @(
    "frontend\src\components\HomePage.jsx",
    "frontend\src\components\Navbar.jsx",
    "frontend\src\components\Layout.jsx",
    "frontend\src\components\MobileBottomBar.jsx",
    "frontend\src\components\TerminalSearch.jsx",
    "frontend\src\components\CommodityInput.jsx",
    "frontend\src\components\ShipItemsPanel.jsx",
    "frontend\src\components\ItemDetailDialog.jsx",
    "frontend\src\components\StarBackground.jsx",
    "frontend\src\components\SkeletonLoader.jsx",
    "frontend\src\components\AppSkeleton.jsx",
    "frontend\src\hooks\useSearchHistory.js",
    "frontend\src\api\cache.js",
    "frontend\src\index.css",
    "frontend\index.html",
    "frontend\public\manifest.json",
    "frontend\public\data\items-catalog.json",
    "frontend\public\javelin.webp",
    "scripts\update-items-catalog.mjs"
)

foreach ($file in $files) {
    $path = Join-Path $baseDir $file
    if (Test-Path $path) {
        $content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
        $body = @{ content = $content; encoding = "utf-8" }
        $blob = Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/git/blobs" -Headers $HEADERS -Method Post -Body ($body | ConvertTo-Json) -ContentType "application/json"
        $treeItems += @{ path = $file.Replace("\", "/"); mode = "100644"; type = "blob"; sha = $blob.sha }
        Write-Host "OK: $file"
    }
}

# 删除的文件
$deleted = @(
    "frontend\src\components\ChangelogDialog.jsx",
    "frontend\src\components\DatabasePanel.jsx",
    "frontend\src\components\PricePanel.jsx",
    "frontend\wrangler.toml",
    "PLATFORM-SHUTDOWN-GUIDE.md",
    "frontend\public\_headers"
)

foreach ($file in $deleted) {
    $treeItems += @{ path = $file.Replace("\", "/"); mode = "100644"; type = "blob"; sha = $null }
    Write-Host "DEL: $file"
}

# 创建tree
$treeBody = @{ base_tree = $baseTreeSha; tree = $treeItems }
$newTree = Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/git/trees" -Headers $HEADERS -Method Post -Body ($treeBody | ConvertTo-Json -Depth 10) -ContentType "application/json"
Write-Host "Tree: $($newTree.sha)"

# 创建commit
$msg = "feat: 首页设计+搜索历史+移动端优化+加载动画+UI统一"
$commitBody = @{ message = $msg; tree = $newTree.sha; parents = @($latestCommitSha) }
$newCommit = Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/git/commits" -Headers $HEADERS -Method Post -Body ($commitBody | ConvertTo-Json -Depth 10) -ContentType "application/json"
Write-Host "Commit: $($newCommit.sha)"

# 更新引用
$updateBody = @{ sha = $newCommit.sha }
Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/git/refs/heads/main" -Headers $HEADERS -Method Patch -Body ($updateBody | ConvertTo-Json) -ContentType "application/json"

Write-Host "DONE!"
