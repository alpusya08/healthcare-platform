package kz.healthcare.platform.auth.domain.exceptions;

import kz.healthcare.platform.shared.exception.BusinessException;
import org.springframework.http.HttpStatus;

public class EmailAlreadyExistsException extends BusinessException {

    public EmailAlreadyExistsException(String email) {
        super("Пользователь с email " + email + " уже существует");
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.CONFLICT;
    }
}
