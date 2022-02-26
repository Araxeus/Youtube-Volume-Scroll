#!/usr/bin/env pwsh

param (
    # The following paths can be relative or absolute:
    [string[]] $FoldersPath = @("unpacked"), # path to folder/s containing the files to be archived
    [string] $ZipPath = "Youtube-Volume-Scroll.zip", # path to zipfile (will be created if it doesn't exist)
    [string] $Filter = "", # "*.*" to only include files that have a .extension
    [string[]] $Exclude = @("*.scss", "_*"), # filterScript has more options 
    [ScriptBlock] $FilterScript = { $_ }, # { ($_.FullName -notlike "*\node_modules\*") -and ($_.Name -notlike "_*") -and ($_.Name -notlike "*.scss")}, # ignore .scss and files that starts with _
    [switch] $OverwriteZip = $false, # overwrite zip (delete existing zip before creating a new one)
    [boolean] $Sync = $true, # keep sync between folder and zip (doesn"t do anything if OverwriteZip=true)
    [string] $Verbose = "Continue", # set to "SilentlyContinue" to ignore verbose
    [boolean] $PauseOnDone = $true, # pause script when done to allow reading output
    [string] $AddVersionFrom = "unpacked\manifest.json", # set empty string to not add a version
    [string] $ScssPaths = @("unpacked/popup") # update scss->css in the directories, leave empty to disable
)

$VerbosePreference = $Verbose
$ChangesCount = 0;

if ($ScssPaths.Length -gt 0) {
    try { # transform scss to css
        sass --update $ScssPaths
    } catch {
        Write-Error  "Error when calling sass: `n $($_.Exception.Message)" 
    }
}

if ($AddVersionFrom) {
    try {
        $jsonFile = Get-Content "unpacked\manifest.json"
        $jsonObj = $jsonFile | ConvertFrom-Json
        $ZipPath = $ZipPath.Replace('.zip', "_v$($jsonObj.version).zip")
    } catch {
        Write-Error("Error adding version: `n $($_.Exception.Message)")
    }
}

if ($OverwriteZip) {
    Remove-item -literalpath $ZipPath -force -ErrorAction SilentlyContinue
}

$AllFiles = @()

@( "System.IO.Compression", "System.IO.Compression.FileSystem") | ForEach-Object { [void][Reflection.Assembly]::LoadWithPartialName($_) }
try {
    $ZipArchive = [IO.Compression.ZipFile]::Open( $ZipPath, "Update" )
    foreach ($FolderPath in $FoldersPath) {
        $FileList = (Get-ChildItem -LiteralPath @($FolderPath) -Filter $Filter -Exclude $Exclude -File -Recurse | Where-Object $FilterScript) #use the -File argument because empty folders can"t be stored
        foreach ($File in $FileList) {
            # get relative path and trim leading .\ from it 
            $File | Add-Member RelativePath ([System.IO.Path]::GetRelativePath($FolderPath, $File.FullName) -replace "^.\\")
            $AllFiles += $File
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
                Write-Verbose "Archived $($ZipPath)\$($ZipArchiveEntry.FullName)"
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
    Write-Output "Archive was succesfully updated ($($ChangesCount) files changed)"
} catch { # failure to open the zip file
    Write-Error $_.Exception
} finally { # always close the zip file so it can be read later
    $ZipArchive.Dispose() 
}

if ($PauseOnDone) {
    cmd /c "pause"
}
