/*
    AE Paste Clipboard Image (ScriptUI)
    포토샵/일러스트 클립보드 이미지를 지정된 경로 혹은 기본 프로젝트폴더/SC 위치에 PNG로 저장.
    창을 띄워두고(또는 도킹하여) 경로 지정 및 붙여넣기를 빠르게 할 수 있습니다.
*/

(function(thisObj) {
    function buildUI(thisObj) {
        // 패널 모드인지 일반 윈도우 모드인지 판단
        var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", "클립보드 이미지 가져오기", undefined, {resizeable:true});
        
        if (win != null) {
            win.orientation = "column";
            win.alignChildren = ["fill", "top"];
            win.spacing = 10;
            win.margins = 10;
            
            // 상단 안내 텍스트
            var infoText = win.add("statictext", undefined, "경로를 비워두면 현재 프로젝트의 SC 폴더에 저장됩니다.");
            infoText.alignment = ["left", "top"];
            
            // 폴더 경로 입력 및 찾아보기 버튼 그룹
            var pathGroup = win.add("group", undefined, "Path Group");
            pathGroup.orientation = "row";
            pathGroup.alignChildren = ["fill", "center"];
            
            var pathInput = pathGroup.add("edittext", undefined, "");
            pathInput.preferredSize.width = 150;
            
            var browseBtn = pathGroup.add("button", undefined, "폴더...");
            browseBtn.preferredSize.width = 50;
            
            // 붙여넣기 실행 버튼
            var pasteBtn = win.add("button", undefined, "클립보드 이미지 붙여넣기");
            pasteBtn.preferredSize.height = 40;
            
            // 레이아웃 리사이징
            win.onResizing = win.onResize = function() {
                this.layout.resize();
            };
            
            // 폴더 경로 탐색 창 열기
            browseBtn.onClick = function() {
                var initialFolder = new Folder(pathInput.text);
                // 입력된 경로가 존재하지 않으면 프로젝트 경로를 기반으로 열기 시도
                if (!initialFolder.exists && app.project && app.project.file) {
                    initialFolder = app.project.file.parent;
                }
                var selectedFolder = Folder.selectDialog("이미지를 저장할 경로를 선택하세요.", initialFolder);
                if (selectedFolder != null) {
                    pathInput.text = selectedFolder.fsName;
                }
            };
            
            // 붙여넣기 실행
            pasteBtn.onClick = function() {
                doPasteImage(pathInput.text);
            };
        }
        return win;
    }

    function doPasteImage(customPath) {
        app.beginUndoGroup("Paste Image from Clipboard");

        try {
            var scFolderPath = "";
            var isDefaultPath = false;
            
            // 경로 지정 여부 체크
            if (customPath && customPath.replace(/^\s+|\s+$/g, '') !== "") {
                scFolderPath = customPath;
            } else {
                // 비어있으면 현재 프로젝트 파일 기준 /SC 폴더 사용
                if (!app.project.file) {
                    alert("저장 경로가 비어있는데 애프터이펙트 프로젝트가 아직 저장되어 있지 않습니다.\n기본 폴더(SC)를 사용하려면 프로젝트(.aep)를 먼저 한 번 저장해주세요.");
                    return;
                }
                scFolderPath = app.project.file.parent.fsName + "\\SC";
                isDefaultPath = true;
            }
            
            var targetFolder = new Folder(scFolderPath);
            if (!targetFolder.exists) {
                if (isDefaultPath) {
                    targetFolder.create(); // 기본 경로면 묻지 않고 생성
                } else {
                    // 사용자가 커스텀 경로를 적었는데 그 폴더가 없는 경우
                    var confirmCreate = confirm("지정한 폴더가 존재하지 않습니다.\n해당 경로에 새 폴더를 생성하시겠습니까?\n" + targetFolder.fsName);
                    if (confirmCreate) {
                        targetFolder.create();
                    } else {
                        return; // 아니오를 누르면 취소
                    }
                }
            }
            
            // 파일명 (Pasted_Img_YYYYMMDD_HHMMSS.png) 생성
            var date = new Date();
            function pad2(n) { return n < 10 ? '0' + n : n; }
            var timestamp = date.getFullYear() + pad2(date.getMonth() + 1) + pad2(date.getDate()) + "_" + 
                            pad2(date.getHours()) + pad2(date.getMinutes()) + pad2(date.getSeconds());
            var fileName = "Pasted_Img_" + timestamp + ".png";
            var filePath = targetFolder.fsName + "\\" + fileName;
            
            // 파워쉘 명령어 안에서 따옴표 충돌이 나지 않게 싱글쿼트 이스케이프 가공
            var psFilePath = filePath.replace(/'/g, "''");
            
            var psCommand = "powershell -STA -windowstyle hidden -NoProfile -ExecutionPolicy Bypass -Command \"Add-Type -AssemblyName PresentationCore; if ([System.Windows.Clipboard]::ContainsImage()) { $img = [System.Windows.Clipboard]::GetImage(); $fs = [System.IO.File]::OpenWrite('" + psFilePath + "'); $encoder = New-Object System.Windows.Media.Imaging.PngBitmapEncoder; $encoder.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($img)); $encoder.Save($fs); $fs.Close(); Write-Output 'SUCCESS' } else { Write-Output 'NO_IMAGE' }\"";
            
            // 파워쉘 시스템콜 실행
            var result = system.callSystem(psCommand);
            
            if (result.indexOf("NO_IMAGE") !== -1) {
                alert("클립보드에 복사된 이미지가 없습니다.\n먼저 포토샵이나 일러스트에서 이미지를 복사(Ctrl+C)해주세요.");
                return;
            }
            
            // 윈도우 파일 시스템이 파일을 잠시 물고 있을 수 있어 200ms 대기 
            $.sleep(200); 
            
            var importedFile = new File(filePath);
            if (importedFile.exists) {
                var importOptions = new ImportOptions(importedFile);
                var importedItem = app.project.importFile(importOptions);
                
                // 에펙 프로젝트 패널 안에 분류 (기본 경로는 SC라는 고정 폴더를, 커스텀 경로는 그 실제 폴더 이름을 이용)
                var binFolderName = isDefaultPath ? "SC" : targetFolder.name;
                var binFolder = null;
                for (var i = 1; i <= app.project.numItems; i++) {
                    if (app.project.item(i) instanceof FolderItem && app.project.item(i).name === binFolderName) {
                        binFolder = app.project.item(i);
                        break;
                    }
                }
                if (!binFolder) {
                    binFolder = app.project.items.addFolder(binFolderName);
                }
                importedItem.parentFolder = binFolder;
                
                // 활성화된 컴포지션이 있으면 선택 후 바로 레이어로 삽입
                var activeComp = app.project.activeItem;
                if (activeComp && activeComp instanceof CompItem) {
                    var newLayer = activeComp.layers.add(importedItem);
                    newLayer.selected = true;
                }
            } else {
                alert("파일 저장에 실패했습니다.\n" + result);
            }
            
        } catch(e) {
            alert("스크립트 실행 중 오류: " + e.toString());
        }

        app.endUndoGroup();
    }
    
    // UI 실행 및 패널 생성
    var myScriptPal = buildUI(thisObj);
    if ((myScriptPal != null) && (myScriptPal instanceof Window)) {
        myScriptPal.center();
        myScriptPal.show();
    }
})(this);
