export interface Settings {
    visibleTableColumns: string[];
    organisationUnitsField: organisationUnitsFieldSelect;
}
type organisationUnitsFieldSelect = "shortName" | "code";
