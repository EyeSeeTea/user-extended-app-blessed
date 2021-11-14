declare module "@dhis2/ui" {
    interface FieldState<FieldValue> {
        active?: boolean;
        blur: () => void;
        change: (value: FieldValue | undefined) => void;
        data?: any;
        dirty?: boolean;
        dirtySinceLastSubmit?: boolean;
        error?: any;
        focus: () => void;
        initial?: FieldValue;
        invalid?: boolean;
        length?: number;
        modified?: boolean;
        modifiedSinceLastSubmit?: boolean;
        name: string;
        pristine?: boolean;
        submitError?: any;
        submitFailed?: boolean;
        submitSucceeded?: boolean;
        submitting?: boolean;
        touched?: boolean;
        valid?: boolean;
        validating?: boolean;
        value?: FieldValue;
        visited?: boolean;
    }

    type FinalFormInput = {
        name: string;
        value?: any;
        onBlur?: (data: any, event: FocusEvent) => void;
        onChange?: (data: any, event: ChangeEvent) => void;
        onFocus?: (data: any, event: FocusEvent) => void;
    };

    type FinalFormMeta = {
        error?: string;
        invalid?: boolean;
        touched?: boolean;
        valid?: boolean;
        validating?: boolean;
    };

    export type InputFieldProps = {
        className?: string;
        dataTest?: string;
        dense?: boolean;
        disabled?: boolean;
        error?: boolean;
        helpText?: string;
        initialFocus?: boolean;
        inputWidth?: string;
        label?: string;
        loading?: boolean;
        max?: string;
        min?: string;
        name?: string;
        placeholder?: string;
        readOnly?: boolean;
        required?: boolean;
        step?: string;
        tabIndex?: string;
        type?:
            | "button"
            | "checkbox"
            | "color"
            | "date"
            | "datetime-local"
            | "email"
            | "file"
            | "hidden"
            | "image"
            | "month"
            | "number"
            | "password"
            | "radio"
            | "range"
            | "reset"
            | "search"
            | "submit"
            | "tel"
            | "text"
            | "time"
            | "url"
            | "week";
        valid?: boolean;
        validationText?: string;
        value?: string;
        warning?: boolean;
        onBlur?: (data: { name?: string; value?: string }, event: FocusEvent) => void;
        onChange?: (data: { name?: string; value?: string }, event: ChangeEvent) => void;
        onFocus?: (data: { name?: string; value?: string }, event: FocusEvent) => void;
    };

    export type InputFieldFFProps = InputFieldProps & {
        input: FinalFormInput;
        meta: FinalFormMeta;
        error?: boolean;
        loading?: boolean;
        showLoadingStatus?: boolean;
        showValidStatus?: boolean;
        valid?: boolean;
        validationText?: string;
    };

    export type ButtonProps = {
        children?: ReactNode;
        className?: string;
        dataTest?: string;
        destructive?: any;
        disabled?: boolean;
        icon?: JSX.Element;
        initialFocus?: boolean;
        large?: any;
        name?: string;
        primary?: any;
        secondary?: any;
        small?: any;
        tabIndex?: string;
        toggled?: boolean;
        type?: "submit" | "reset" | "button";
        value?: string;
        onBlur?: (data: { value?: string; name?: string }, event: FocusEvent) => void;
        onClick?: (data: { value?: string; name?: string }, event: MouseEvent) => void;
        onFocus?: (data: { value?: string; name?: string }, event: FocusEvent) => void;
    };

    export type TransferOption = {
        label: string;
        value: string;
        disabled?: boolean;
    };

    export type TransferProps = {
        options: TransferOption[];
        onChange: (params: { selected: string[] }) => void;
        addAllText?: string;
        addIndividualText?: string;
        className?: string;
        dataTest?: string;
        disabled?: boolean;
        enableOrderChange?: boolean;
        filterCallback?: (...args: any[]) => any;
        filterCallbackPicked?: (...args: any[]) => any;
        filterLabel?: string;
        filterLabelPicked?: string;
        filterPlaceholder?: string;
        filterPlaceholderPicked?: string;
        filterable?: boolean;
        filterablePicked?: boolean;
        height?: string;
        hideFilterInput?: boolean;
        hideFilterInputPicked?: boolean;
        initialSearchTerm?: string;
        initialSearchTermPicked?: string;
        leftFooter?: React.ReactNode;
        leftHeader?: React.ReactNode;
        loading?: boolean;
        loadingPicked?: boolean;
        maxSelections?: any;
        optionsWidth?: string;
        removeAllText?: string;
        removeIndividualText?: string;
        renderOption?: (...args: any[]) => any;
        rightFooter?: React.ReactNode;
        rightHeader?: React.ReactNode;
        searchTerm?: string;
        searchTermPicked?: string;
        selected?: string[];
        selectedEmptyComponent?: React.ReactNode;
        selectedWidth?: string;
        sourceEmptyPlaceholder?: React.ReactNode;
        onEndReached?: (...args: any[]) => any;
        onEndReachedPicked?: (...args: any[]) => any;
        onFilterChange?: (...args: any[]) => any;
        onFilterChangePicked?: (...args: any[]) => any;
    };

    export type MultiSelectProps = {
        children: React.ReactNode;
        className: string;
        /** Required if `clearable` prop is `true` */
        clearText: string;
        /** Adds a 'clear' option to the menu */
        clearable: boolean;
        dataTest: string;
        dense: boolean;
        disabled: boolean;
        empty: React.ReactNode;
        error: boolean;
        filterPlaceholder: string;
        /** Adds a 'filter' field to the menu */
        filterable: boolean;
        initialFocus: boolean;
        inputMaxHeight: string;
        loading: boolean;
        loadingText: string;
        maxHeight: string;
        /** Required if `filterable` prop is `true` */
        noMatchText: string;
        placeholder: string;
        prefix: string;
        selected: string[];
        tabIndex: string;
        valid: boolean;
        warning: boolean;
        onBlur?: (data: { value?: string; name?: string }, event: FocusEvent) => void;
        onChange?: (data: { value?: string; name?: string }, event: ChangeEvent) => void;
        onFocus?: (data: { value?: string; name?: string }, event: FocusEvent) => void;
    };

    export type MultiSelectFieldFFProps = MultiSelectProps & {
        input: FinalFormInput;
        meta: FinalFormMeta;
        error?: boolean;
        loading?: boolean;
        options?: {
            label?: string;
            value?: string;
        }[];
        showLoadingStatus?: boolean;
        showValidStatus?: boolean;
        valid?: boolean;
        validationText?: string;
    };

    export type SingleSelectFieldProps = {
        className?: string;
        clearText?: string | ((...args: any[]) => any);
        clearable?: boolean;
        dataTest?: string;
        dense?: boolean;
        disabled?: boolean;
        empty?: React.ReactNode | ((...args: any[]) => any);
        error?: any;
        filterPlaceholder?: React.ReactNode | ((...args: any[]) => any);
        filterable?: boolean;
        helpText?: string;
        initialFocus?: boolean;
        inputMaxHeight?: string;
        inputWidth?: string;
        label?: string;
        loading?: boolean;
        loadingText?: string | ((...args: any[]) => any);
        maxHeight?: string;
        noMatchText?: string | ((...args: any[]) => any);
        placeholder?: string;
        prefix?: string;
        required?: boolean;
        selected?: string;
        tabIndex?: string;
        valid?: any;
        validationText?: string;
        warning?: any;
        children?: React.ReactNode;
        onBlur?: (...args: any[]) => any;
        onChange?: (value: { selected: string }, event: MouseEvent) => void;
        onFocus?: (...args: any[]) => any;
    };

    export type SingleSelectOptionProps = {
        label: string;
        value: string;
        active?: boolean;
        className?: string;
        dataTest?: string;
        disabled?: boolean;
        onClick?: (...args: any[]) => any;
    };

    export type SingleSelectFieldFFProps = SingleSelectFieldProps & {
        input: FinalFormInput;
        meta: FinalFormMeta;
        options: {
            label?: string;
            value?: string;
        }[];
        error?: boolean;
        loading?: boolean;
        showLoadingStatus?: boolean;
        showValidStatus?: boolean;
        valid?: boolean;
        validationText?: string;
    };

    export type TabProps = {
        children: React.ReactNode;
        className?: string;
        dataTest?: string;
        disabled?: boolean;
        icon?: JSX.Element;
        selected?: boolean;
        onClick?: (value: {}, event: MouseEvent) => void;
    };

    export type TabBarProps = {
        children: React.ReactNode;
        className?: string;
        dataTest?: string;
        fixed?: boolean;
        scrollable?: boolean;
    };

    export type MenuProps = {
        children: React.ReactNode;
        className?: string;
        dataTest?: string;
        dense?: boolean;
    };

    export type MenuItemProps = {
        active?: boolean;
        chevron?: boolean;
        className?: string;
        dataTest?: string;
        dense?: boolean;
        destructive?: boolean;
        disabled?: boolean;
        href?: string;
        icon?: React.ReactNode;
        label?: React.ReactNode;
        showSubMenu?: boolean;
        target?: string;
        toggleSubMenu?: (...args: any[]) => any;
        value?: string;
        onClick?: (data: { value?: string }, event: MouseEvent) => void;
    };

    export type PaginationProps = {
        page: number;
        pageCount: number;
        pageSize: number;
        total: number;
        className?: string;
        dataTest?: string;
        hidePageSelect?: boolean;
        hidePageSizeSelect?: boolean;
        nextPageText?: string | ((...args: any[]) => any);
        pageSelectText?: string | ((...args: any[]) => any);
        pageSizeSelectText?: string | ((...args: any[]) => any);
        pageSizes?: string[];
        pageSummaryText?: string | ((...args: any[]) => any);
        previousPageText?: string | ((...args: any[]) => any);
        onPageChange: (page: number) => void;
        onPageSizeChange: (pageSize: number) => void;
    };

    export type ButtonStripProps = {
        children: React.ReactNode;
        className?: string;
        dataTest?: string;
        end?: boolean;
        middle?: boolean;
    };

    export type NoticeBoxProps = {
        children?: React.ReactNode;
        className?: string;
        dataTest?: string;
        error?: boolean;
        title?: string;
        warning?: boolean;
    };

    export type CheckboxFieldProps = {
        checked?: boolean;
        className?: string;
        dataTest?: string;
        dense?: boolean;
        disabled?: boolean;
        error?: boolean;
        indeterminate?: boolean;
        initialFocus?: boolean;
        label?: React.ReactNode;
        name?: string;
        tabIndex?: string;
        valid?: boolean;
        value?: string;
        warning?: boolean;
        onBlur?: (data: { value?: string; name?: string; checked: boolean }, event: FocusEvent) => void;
        onChange?: (data: { value?: string; name?: string; checked: boolean }, event: ChangeEvent) => void;
        onFocus?: (data: { value?: string; name?: string; checked: boolean }, event: FocusEvent) => void;
    };

    export type CheckboxFieldFFProps = CheckboxFieldProps & {
        input: FinalFormInput;
        meta: FinalFormMeta;
        error?: boolean;
        showValidStatus?: boolean;
        valid?: boolean;
        validationText?: string;
    };

    type SwitchFieldProps = {
        ariaLabel?: string;
        checked?: boolean;
        className?: string;
        dataTest?: string;
        dense?: boolean;
        disabled?: boolean;
        error?: boolean;
        initialFocus?: boolean;
        label?: React.ReactNode;
        name?: string;
        role?: string;
        tabIndex?: string;
        valid?: boolean;
        value?: string;
        warning?: boolean;
        onBlur?: (data: { name?: string; value?: string; checked: boolean }, event: FocusEvent) => void;
        onChange?: (data: { name?: string; value?: string; checked: boolean }, event: ChangeEvent) => void;
        onFocus?: (data: { name?: string; value?: string; checked: boolean }, event: FocusEvent) => void;
    };

    export type SwitchFieldFFProps = SwitchFieldProps & {
        input: FinalFormInput;
        meta: FinalFormMeta;
        showValidStatus?: boolean;
        validationText?: string;
    };

    export type CenteredContentProps = {
        children?: React.ReactNode;
        dataTest?: string;
        className?: string;
        position?: "top" | "bottom" | "middle";
    };

    export function HeaderBar(props: { className?: string; appName: string }): React.ReactElement;
    export function InputField(props: InputFieldProps): React.ReactElement;
    export function InputFieldFF(props: InputFieldFFProps): React.ReactElement;
    export function Button(props: ButtonProps): React.ReactElement;
    export function Transfer(props: TransferProps): React.ReactElement;
    export function MultiSelect(props: MultiSelectProps): React.ReactElement;
    export function MultiSelectFieldFF(props: MultiSelectFieldFFProps): React.ReactElement;
    export function SingleSelectFieldFF(props: SingleSelectFieldFFProps): React.ReactElement;
    export function SingleSelectField(props: SingleSelectFieldProps): React.ReactElement;
    export function SingleSelectOption(props: SingleSelectOptionProps): React.ReactElement;
    export function Tab(props: TabProps): React.ReactElement;
    export function TabBar(props: TabBarProps): React.ReactElement;
    export function Menu(props: MenuProps): React.ReactElement;
    export function MenuItem(props: MenuItemProps): React.ReactElement;
    export function Pagination(props: PaginationProps): React.ReactElement;
    export function ButtonStrip(props: ButtonStripProps): React.ReactElement;
    export function NoticeBox(props: NoticeBoxProps): React.ReactElement;
    export function CheckboxField(props: CheckboxFieldProps): React.ReactElement;
    export function CheckboxFieldFF(props: CheckboxFieldFFProps): React.ReactElement;
    export function SwitchField(props: SwitchFieldProps): React.ReactElement;
    export function SwitchFieldFF(props: SwitchFieldFFProps): React.ReactElement;
    export function CenteredContent(props: CenteredContentProps): React.ReactElement;

    export function composeValidators(
        ...validators: ((value: unknown) => string | undefined)[]
    ): (value: unknown) => string | undefined;
    export function integer(value: unknown): string | undefined;
    export function boolean(value: unknown): string | undefined;
    export function alphaNumeric(value: unknown): string | undefined;
    export function email(value: unknown): string | undefined;
    export function number(value: unknown): string | undefined;
    export function string(value: unknown): string | undefined;
    export function url(value: unknown): string | undefined;
    export function hasValue(value: unknown): string | undefined;
    export function createMinNumber(min: number): (value: unknown) => string | undefined;
    export function createPattern(pattern: RegExp, message?: string): (value: unknown) => string | undefined;
    export function createMaxCharacterLength(bound: number): (value: unknown) => string | undefined;
    export function createMinCharacterLength(bound: number): (value: unknown) => string | undefined;
}
