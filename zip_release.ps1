#!/usr/bin/env pwsh

param (
    # The following paths can be relative or absolute:
    # path to folder/s containing the files to be archived
    [string[]] $FoldersPath = @("unpacked"),
    # path to zipfile / zipFolder if $ZipNameFromJson is specified (will be created if it doesn't exist)
    [string] $ZipPath = "",
    # set $ZipPath to end with .zip or set this to an empty string to disable this feature
    [string] $ZipNameFromJson = "unpacked\manifest.json", # $name_v$version.zip
    # ie "*.*" to only include files that have a .extension
    [string] $Filter = "",
    # filterScript has more options than eclude
    [string[]] $Exclude = @("*.scss", "_*"),
    # { ($_.FullName -notlike "*\node_modules\*") -and ($_.Name -notlike "*.scss")}, # ignore .scss and nodeModules folder
    [ScriptBlock] $FilterScript = { $_ },
    # overwrite zip (if there is a zip with the same name, delete it creating a new one)
    [switch] $OverwriteZip = $false,
    # keep sync between folder and zip (doesn"t do anything if OverwriteZip=true) - delete surplus files from zip
    [boolean] $Sync = $true,
    # pause script when done to allow reading output
    [boolean] $PauseOnDone = $true,
    # update scss->css in the directories, leave empty to disable
    [string] $ScssPaths = @("unpacked/popup"),
    # verbose output
    [boolean] $Verbose = $true
)

if ($Verbose) {
    $VerbosePreference = "Continue"
} else {
    $VerbosePreference = "SilentlyContinue" 
}
$ChangesCount = 0;

if ($ScssPaths.Length -gt 0) {
    try { # transform scss to css
        sass --update $ScssPaths
    } catch {
        Write-Error  "Error when calling sass: `n $($_.Exception.Message)" 
    }
}

if ($ZipNameFromJson -and !$ZipPath.EndsWith('.zip')) {
        $jsonFile = Get-Content $ZipNameFromJson
        $jsonObj = $jsonFile | ConvertFrom-Json
        $ZipName = "$($jsonObj.name.Replace(' ', '-'))_v$($jsonObj.version).zip"
    if ($ZipPath) {
        try {  
            [System.IO.Directory]::CreateDirectory($ZipPath) | Out-Null
            $ZipPath = [IO.Path]::Combine($ZipPath, $ZipName)
        } catch {
            Write-Error("Error creating ZipPath: `n $($_.Exception.Message)")
            $ZipPath = $ZipName
        }
    } else {
        $ZipPath = $ZipName
    }
}

if ($OverwriteZip) {
    Remove-item -literalpath $ZipPath -force -ErrorAction SilentlyContinue
}

$AllFiles = New-Object System.Collections.Generic.List[System.Object]

try {
    $ZipArchive = [IO.Compression.ZipFile]::Open( $ZipPath, "Update" )
    foreach ($FolderPath in $FoldersPath) {
        $FileList = (Get-ChildItem -LiteralPath $FolderPath -Filter $Filter -Exclude $Exclude -File -Recurse | Where-Object $FilterScript) #use the -File argument because empty folders can"t be stored
        foreach ($File in $FileList) {
            if ($File.FullName.endsWith($ZipPath)) { continue }
            # get relative path and trim leading .\ from it 
            $File | Add-Member RelativePath ([System.IO.Path]::GetRelativePath($FolderPath, $File.FullName) -replace "^.\\")
            $AllFiles.Add($File)
            try { # zip will store multiple copies of the exact same file - prevent this by checking if already archived.
                if (!$OverwriteZip) {
                    $AlreadyArchivedFile = $ZipArchive.GetEntry($File.RelativePath)
                    # $AlreadyArchivedFile = ($ZipArchive.Entries | Where-Object { $_.FullName -eq $File.RelativePath })
                    if ($AlreadyArchivedFile) {
                        if (($AlreadyArchivedFile.Length -eq $File.Length) -and
                            #ZipFileExtensions timestamps are only precise within 2 seconds.
                            ([math]::Abs(($AlreadyArchivedFile.LastWriteTime.UtcDateTime - $File.LastWriteTimeUtc).Seconds) -le 2)) {
                            continue
                        }
                        $AlreadyArchivedFile.Delete()
                    }
                }
                $ZipArchiveEntry = [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($ZipArchive, $File.FullName, $File.RelativePath, 'Optimal')
                $ChangesCount++
                Write-Verbose "Archived \$($ZipArchiveEntry.FullName)"
            } catch { # single file failed - usually inaccessible or in use
                Write-Warning  "$($File.FullName) could not be archived. `n $($_.Exception.Message)"
                }
            }
    }
    if ($Sync -and !$OverwriteZip) {
        $UnsyncedFiles = $ZipArchive.Entries | Where-Object -Property FullName -NotIn ($AllFiles | ForEach-Object { $_.RelativePath })
        foreach ($File in $UnsyncedFiles) {
            try {
                $File.Delete()
                $ChangesCount++
                Write-Verbose "Deleted $($ZipPath)\$($File.FullName)"
            } catch {
                Write-Warning "$($ZipPath)\$($File.FullName) is not in sync but couldn't be deleted"
            }
        }
    }
    if ($Verbose) {
        $ZipPath = Resolve-Path $ZipPath
    }
    Write-Output "$($ZipPath) was succesfully updated ($($ChangesCount) files changed)"
} catch { # failure to open the zip file
    Write-Error $_.Exception
} finally { # always close the zip file so it can be read later
    $ZipArchive.Dispose() 
}

if ($PauseOnDone) {
    cmd /c "pause"
}
