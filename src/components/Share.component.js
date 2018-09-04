import React from 'react';
import logo from '../images/logo-eyeseetea.png';

class Share extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            expanded: false,
        };
    }

    render() {
        const styles = {
            eyeseeteaShare: {
                backgroundColor: 'rgb(243,243,243)',
                position: 'absolute',
                bottom: '0px',
                right: '100px',
                borderRadius: '0px',
                height: 'auto',
                opacity: '.85',
                paddingBottom: '30px',
                width: '65px',
                zIndex: 10001,
                textAlign: 'center',
                // transition: 'opacity 8s linear'
            },

            eyeseeteaShareButtons: {
                width: '35px',
                cursor: 'pointer',
                backgroundColor: 'white',
                borderradius: 0,
                opacity: 1,
                color: 'white',
                boxShadow: 'none',
                textShadow: 'none',
                border: '0px',
                textAlign: 'center'
            },

            eyeseeteaIcon: {
                width: '15px'
            },
            twitterIcon: {
                color: '#477726',
                fontSize: '20px'
            },

            shareTab: {
                bottom: '0px',
                right: '100px',
                position: 'fixed',
                zIndex: 10002
            },

            share: {
                boxShadow: 'none',
                textShadow: 'none',
                backgroundColor: '#ff9800',
                borderRadius: '0px',
                color: 'white',
                width: '65px',
                height: '35px',
                border: '0px',
                cursor: 'pointer',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '2px',
                backgroundClip: 'padding-box',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
            }
        };
        return (
            <div>
                <div style={styles.shareTab}>
                    <button style={styles.share} onClick={() => this.setState({ expanded: !this.state.expanded })}>
                        <i className="fa fa-share icon-xlarge"></i>
                    </button>
                </div>
                {this.state.expanded ?
                    <div style={styles.eyeseeteaShare}>
                        <p>

                            <button style={styles.eyeseeteaShareButtons} onClick={() => window.open('http://www.eyeseetea.com/', '_blank')}>
                                <img src={logo} alt="EyeSeeTea" style={styles.eyeseeteaIcon} />
                            </button>
                        </p>
                        <p>
                            <button style={styles.eyeseeteaShareButtons} onClick={() => window.open('https://twitter.com/eyeseetealtd', '_blank')}>
                                <i className="fa fa-twitter" alt="Go to EyeSeeTea Twitter" style={styles.twitterIcon}></i>
                            </button>
                        </p>
                    </div> : null}
            </div>
        );

    }
}

export default Share;
