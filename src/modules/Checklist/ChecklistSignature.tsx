import React, { useEffect, useState } from 'react';
import {
    ChecklistDetails,
    ItemToMultiSignOrVerify,
} from '../../typings/apiTypes';
import { Button, TextField } from '@equinor/eds-core-react';
import styled from 'styled-components';
import {
    determineHelperText,
    determineVariant,
} from '../../utils/textFieldHelpers';
import { ProcosysApiService } from '../../services/procosysApi';
import ChecklistMultiSignOrVerify from './ChecklistMultiSignOrVerify';
import axios from 'axios';
import { AsyncStatus } from '../../typings/enums';

const ChecklistSignatureWrapper = styled.div<{ helperTextVisible: boolean }>`
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    padding: 12px 4%;
    margin-bottom: 12px;
`;

const CommentHeader = styled.h5`
    margin-top: 24px;
    margin-bottom: 12px;
`;

const SignOrVerifyWrapper = styled.div<{ eligible: boolean }>`
    display: flex;
    flex-direction: column;
    margin-top: 12px;
    background-color: ${(props): string =>
        props.eligible ? '#deecee' : '#eb003726'};
    padding: 0 16px;
`;

const ButtonWrapper = styled.div`
    display: flex;
    margin-bottom: 12px;
    justify-content: flex-end;
    & > :last-child {
        margin: 0;
        margin-left: 12px;
    }
`;

const determineSignButtonText = (
    isSigned: boolean,
    status: AsyncStatus
): string => {
    if (status === AsyncStatus.LOADING) {
        if (isSigned) return 'Unsigning...';
        return 'Signing...';
    } else {
        if (isSigned) return 'Unsign';
        return 'Sign';
    }
};

const determineVerifyButtonText = (
    isVerified: boolean,
    status: AsyncStatus
): string => {
    if (status === AsyncStatus.LOADING) {
        if (isVerified) return 'Unverifying...';
        return 'Verifying...';
    } else {
        if (isVerified) return 'Unverify';
        return 'Verify';
    }
};

type ChecklistSignatureProps = {
    details: ChecklistDetails;
    setIsSigned: React.Dispatch<React.SetStateAction<boolean>>;
    isSigned: boolean;
    allItemsCheckedOrNA: boolean;
    reloadChecklist: React.Dispatch<React.SetStateAction<boolean>>;
    setSnackbarText: (message: string) => void;
    api: ProcosysApiService;
    setMultiSignOrVerifyIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    multiSignOrVerifyIsOpen: boolean;
};

const ChecklistSignature = ({
    details,
    setIsSigned,
    isSigned,
    allItemsCheckedOrNA,
    reloadChecklist,
    setSnackbarText,
    api,
    setMultiSignOrVerifyIsOpen,
    multiSignOrVerifyIsOpen,
}: ChecklistSignatureProps): JSX.Element => {
    const [comment, setComment] = useState(details.comment);
    const [putCommentStatus, setPutCommentStatus] = useState(
        AsyncStatus.INACTIVE
    );
    const [signStatus, setSignStatus] = useState(AsyncStatus.INACTIVE);
    const [verifyStatus, setVerifyStatus] = useState(AsyncStatus.INACTIVE);
    const [isVerified, setIsVerified] = useState<boolean>(
        details.verifiedByUser !== null
    );
    const [
        eligibleItemsToMultiSignOrVerify,
        setEligibleItemsToMultiSignOrVerify,
    ] = useState<ItemToMultiSignOrVerify[]>([]);
    const source = axios.CancelToken.source();
    let commentBeforeFocus = '';

    const putComment = async (): Promise<void> => {
        if (comment === commentBeforeFocus) return;
        setPutCommentStatus(AsyncStatus.LOADING);
        try {
            await api.putChecklistComment(comment);
            setPutCommentStatus(AsyncStatus.SUCCESS);
            reloadChecklist((prev) => !prev);
        } catch (error) {
            setPutCommentStatus(AsyncStatus.ERROR);
        }
    };

    const handleUnsignClick = async (): Promise<void> => {
        setSignStatus(AsyncStatus.LOADING);
        try {
            await api.postUnsign();
            setSnackbarText('Unsign complete.');
            reloadChecklist((reloadStatus) => !reloadStatus);
            setSignStatus(AsyncStatus.SUCCESS);
            setIsSigned(false);
        } catch (error) {
            if (!(error instanceof Error)) return;
            setSignStatus(AsyncStatus.ERROR);
            setSnackbarText(error.toString());
        }
    };

    const handleSignClick = async (): Promise<void> => {
        setSignStatus(AsyncStatus.LOADING);
        try {
            await api.postSign();
            const eligibleItemsToMultiSignFromApi = await api.getCanMultiSign(
                source.token
            );
            setEligibleItemsToMultiSignOrVerify(
                eligibleItemsToMultiSignFromApi
            );
            setIsSigned(true);
            setSignStatus(AsyncStatus.SUCCESS);
            reloadChecklist((reloadStatus) => !reloadStatus);
            if (eligibleItemsToMultiSignFromApi.length === 0) {
                setSnackbarText(
                    isSigned ? 'Unsign complete.' : 'Signing complete.'
                );
            } else {
                setMultiSignOrVerifyIsOpen(true);
            }
        } catch (error) {
            if (!(error instanceof Error)) return;
            setSignStatus(AsyncStatus.ERROR);
            setSnackbarText(error.toString());
        }
    };

    const handleUnverifyClick = async (): Promise<void> => {
        setVerifyStatus(AsyncStatus.LOADING);
        try {
            await api.postUnverify();
            setIsVerified(false);
            setVerifyStatus(AsyncStatus.SUCCESS);
            setSnackbarText('Checklist successfully unverified');
            reloadChecklist((reloadStatus) => !reloadStatus);
        } catch (error) {
            if (!(error instanceof Error)) return;
            setVerifyStatus(AsyncStatus.ERROR);
            setSnackbarText(error.toString());
        }
    };

    const handleVerifyClick = async (): Promise<void> => {
        setVerifyStatus(AsyncStatus.LOADING);
        try {
            await api.postVerify();
            const eligibleItemsToMultiVerifyFromApi =
                await api.getCanMultiVerify(source.token);
            setEligibleItemsToMultiSignOrVerify(
                eligibleItemsToMultiVerifyFromApi
            );
            setIsVerified(true);
            setVerifyStatus(AsyncStatus.SUCCESS);
            reloadChecklist((reloadStatus) => !reloadStatus);
            if (eligibleItemsToMultiVerifyFromApi.length === 0) {
                setSnackbarText('Checklist successfully verified');
            } else {
                setMultiSignOrVerifyIsOpen(true);
            }
        } catch (error) {
            if (!(error instanceof Error)) return;
            setVerifyStatus(AsyncStatus.ERROR);
            setSnackbarText(error.toString());
        }
    };

    const updatedByText = (): string => {
        return `Updated by ${details.updatedByFirstName} ${
            details.updatedByLastName
        } at ${new Date(details.updatedAt).toLocaleDateString('en-GB')}`;
    };

    useEffect(() => {
        if (
            putCommentStatus === AsyncStatus.INACTIVE ||
            putCommentStatus === AsyncStatus.LOADING
        )
            return;
        setTimeout(() => {
            setPutCommentStatus(AsyncStatus.INACTIVE);
        }, 2000);
    }, [putCommentStatus]);

    useEffect(() => {
        return (): void => {
            source.cancel('Checklist signature component unmounted.');
        };
    }, []);

    const determineSignatureText = (): JSX.Element => {
        if (isSigned) {
            return (
                <p>
                    Signed by {details.signedByFirstName}{' '}
                    {details.signedByLastName} at{' '}
                    {new Date(details.signedAt).toLocaleDateString('en-GB')}
                </p>
            );
        }
        if (allItemsCheckedOrNA) {
            return <p>Checklist is ready to be signed.</p>;
        }
        if (!isSigned && !allItemsCheckedOrNA) {
            return <p>All items must be checked or NA before signing.</p>;
        }
        return <></>;
    };

    const determineVerifyText = (): JSX.Element => {
        if (!isVerified) {
            return <></>;
        }
        return (
            <p>
                Verified by {details.verifiedByFirstName}{' '}
                {details.verifiedByLastName} at{' '}
                {new Date(details.verifiedAt).toLocaleDateString('en-GB')}
            </p>
        );
    };

    return (
        <ChecklistSignatureWrapper
            helperTextVisible={putCommentStatus !== AsyncStatus.INACTIVE}
        >
            {!multiSignOrVerifyIsOpen && (
                <>
                    <CommentHeader>Comment and sign</CommentHeader>
                    <TextField
                        id={'comment-field'}
                        maxLength={500}
                        variant={determineVariant(putCommentStatus)}
                        disabled={
                            isSigned || putCommentStatus === AsyncStatus.LOADING
                        }
                        multiline
                        rows={5}
                        helperText={
                            putCommentStatus === AsyncStatus.INACTIVE &&
                            details.updatedAt
                                ? updatedByText()
                                : determineHelperText(putCommentStatus)
                        }
                        value={comment}
                        onChange={(
                            e: React.ChangeEvent<
                                HTMLInputElement | HTMLTextAreaElement
                            >
                        ): void => setComment(e.target.value)}
                        onFocus={(): string => (commentBeforeFocus = comment)}
                        onBlur={putComment}
                    />
                    <SignOrVerifyWrapper eligible={allItemsCheckedOrNA}>
                        <div>
                            {determineSignatureText()} {determineVerifyText()}
                        </div>
                        <ButtonWrapper>
                            {isVerified ? null : (
                                <Button
                                    variant={
                                        isSigned ? 'outlined' : 'contained'
                                    }
                                    onClick={(): void => {
                                        isSigned
                                            ? handleUnsignClick()
                                            : handleSignClick();
                                    }}
                                    disabled={
                                        signStatus === AsyncStatus.LOADING ||
                                        !allItemsCheckedOrNA
                                    }
                                >
                                    {determineSignButtonText(
                                        isSigned,
                                        signStatus
                                    )}
                                </Button>
                            )}
                            {isSigned ? (
                                <Button
                                    variant={
                                        isVerified ? 'outlined' : 'contained'
                                    }
                                    onClick={(): Promise<void> =>
                                        isVerified
                                            ? handleUnverifyClick()
                                            : handleVerifyClick()
                                    }
                                    disabled={
                                        verifyStatus === AsyncStatus.LOADING
                                    }
                                >
                                    {determineVerifyButtonText(
                                        isVerified,
                                        verifyStatus
                                    )}
                                </Button>
                            ) : null}
                        </ButtonWrapper>
                    </SignOrVerifyWrapper>
                </>
            )}

            {multiSignOrVerifyIsOpen ? (
                <ChecklistMultiSignOrVerify
                    isMultiVerify={isVerified}
                    eligibleItems={eligibleItemsToMultiSignOrVerify}
                    tagNo={details.tagNo}
                    api={api}
                    setMultiSignOrVerifyIsOpen={setMultiSignOrVerifyIsOpen}
                    setSnackbarText={setSnackbarText}
                />
            ) : null}
        </ChecklistSignatureWrapper>
    );
};

export default ChecklistSignature;