declare module "@dhis2/ui" {
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

    export type CenteredContentProps = {
        children?: React.ReactNode;
        dataTest?: string;
        className?: string;
        position?: "top" | "bottom" | "middle";
    };
    
    export function HeaderBar(props: { className?: string; appName?: string }): React.ReactElement;
    export function Button(props: ButtonProps): React.ReactElement;
    export function ButtonStrip(props: ButtonStripProps): React.ReactElement;
    export function NoticeBox(props: NoticeBoxProps): React.ReactElement;
    export function CenteredContent(props: CenteredContentProps): React.ReactElement;

}
