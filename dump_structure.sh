#!/usr/bin/env bash
# dump_structure.sh   –   chmod +x dump_structure.sh

###############################################################################
#  Recursive directory tree + full-file dump                                  #
#  Includes dot-files, EXCEPT:                                                #
#      • any __pycache__/ directory                                           #
#      • any .git/ directory                                                  #
#      • any .github/ directory                                               #
#      • files: .DS_Store, .gitignore, dump_structure.sh, folder_dump_*.txt   #
###############################################################################

OUTPUT_FILE="folder_dump_$(date +%Y%m%d_%H%M%S).txt"

# -------------------------- 1) Directory tree -------------------------------
echo -e "### DIRECTORY TREE (excl. __pycache__, .git, .github, .DS_Store, .gitignore, dump_structure.sh, folder_dump_*.txt) ###\n" \
  | tee  "$OUTPUT_FILE"

if command -v tree >/dev/null 2>&1; then
    # -a  show hidden entries
    # -I  ignore pattern (| separates multiple patterns)
    tree -a -F -I '.git|__pycache__|.github|.DS_Store|.gitignore|dump_structure.sh|folder_dump_*.txt' \
      | tee -a "$OUTPUT_FILE"
else
    # Portable fallback if tree(1) isn’t installed
    find . \( -path '*/.git' -o -path '*/__pycache__' -o -path '*/.github' \) -prune -o \
           -name '.DS_Store' -o -name '.gitignore' -o -name 'dump_structure.sh' -o -name 'folder_dump_*.txt' -prune -o \
           -print \
      | sed -e 's/[^-][^\/]*\//|   /g' -e 's/|\([^ ]\)/|-- \1/' \
      | tee -a "$OUTPUT_FILE"
fi

# -------------------------- 2) File contents --------------------------------
echo -e "\n\n### FILE CONTENTS (same exclusions) ###\n" \
  | tee -a "$OUTPUT_FILE"

while IFS= read -r -d '' file; do
    printf '\n===== %s =====\n\n' "$file" | tee -a "$OUTPUT_FILE"
    cat "$file" 2>/dev/null | tee -a "$OUTPUT_FILE"
done < <(
    find . \( -path '*/.git' -o -path '*/__pycache__' -o -path '*/.github' \) -prune -o \
           -type f \
           ! -name '.DS_Store' \
           ! -name '.gitignore' \
           ! -name 'dump_structure.sh' \
           ! -name 'folder_dump_*.txt' \
           -print0
)

echo -e "\n\nAll done – full dump saved to $OUTPUT_FILE"
