
import org.junit.jupiter.api.*;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class DomainTest {

    WebDriver driver;

    private static final String BASE_URL =
            "https://www.marvincall.com/";

    @BeforeEach
    void setUp() {
        driver = new ChromeDriver();
    }

    @Test
    void verifyWebsiteAccessibility() {
        driver.get(BASE_URL);

        assertTrue(
                driver.getCurrentUrl().startsWith("https://"),
                "Website must use HTTPS"
        );
    }

    @Test
    void verifyPageTitle() {
        driver.get(BASE_URL);

        String title = driver.getTitle();

        assertFalse(
                title.isBlank(),
                "Page title must not be empty"
        );

        System.out.println("Page Title: " + title);
    }

    @Test
    void detectAuthenticationPage() {
        driver.get(BASE_URL);

        String pageContent =
                driver.findElement(By.tagName("body")).getText();

        assertFalse(
                pageContent.toLowerCase().contains("sign in to vercel"),
                "Website should be accessible without Vercel authentication"
        );
    }

    @Test
    void inspectNavigationLinks() {
        driver.get(BASE_URL);

        List<WebElement> links =
                driver.findElements(By.cssSelector("a"));

        System.out.println("Total links: " + links.size());

        for (WebElement link : links) {
            System.out.println(
                    "TEXT: [" + link.getText().trim() +
                            "] | HREF: [" + link.getAttribute("href") + "]"
            );
        }

        assertTrue(
                links.size() > 0,
                "Website should contain navigation links"
        );
    }

    @AfterEach
    void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }
}
